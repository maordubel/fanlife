import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { entity } from '@/lib/archive/graph'
import { playableLineups } from '@/lib/game/lineup'
import { goalYears } from '@/lib/game/goal'
import { GATES } from '@/lib/gates'
import { gateHref, lifeHref, lineupHref, matchOfGoal, playableGoalHref } from '@/lib/links'
import { recommend } from '@/lib/results/context'
import type { NextAction } from '@/lib/results/types'

/**
 * RESULT CONTEXT + RECOMMEND (ONE RED WORLD §5, §38). The engine is deterministic, gives at
 * most one primary and one secondary, resolves every href through `lib/links`, never
 * points a gate back at itself, and never opens LIFE without the unlock check.
 */
const ROOT = join(__dirname, '..')

function landsOn(action: NextAction): boolean {
  const url = new URL(action.href, 'https://x.test')
  if (url.pathname === '/archive') return entity(url.searchParams.get('at')) !== null
  if (url.pathname === '/goal') return goalYears().some((g) => g.id === url.searchParams.get('g'))
  if (url.pathname === '/life') return true
  if (url.pathname === '/away-days') return true
  return GATES.some((g) => g.href?.split('?')[0] === url.pathname)
}

const goal = goalYears().find((g) => matchOfGoal(g.id))
const lineupMatch = playableLineups()[0]?.matchRef as string | undefined

describe('the new doors in lib/links', () => {
  it('opens a gate only when the wall has it open', () => {
    for (const g of GATES) expect(gateHref(g.number)).toBe(g.href ? g.href.split('?')[0] : null)
    expect(gateHref(99)).toBeNull()
  })
  it('offers gate 3 only for a match with a verified XI', () => {
    expect(lineupMatch).toBeTruthy()
    expect(lineupHref(lineupMatch)).toBe('/lineup')
    expect(lineupHref('m_000000000000')).toBeNull()
  })
  it('offers gate 8 only for a goal the deck deals', () => {
    expect(goal).toBeTruthy()
    expect(playableGoalHref(goal?.id)).toBe(`/goal?g=${encodeURIComponent(goal?.id as string)}`)
    expect(playableGoalHref('nope')).toBeNull()
  })
  it('opens LIFE only when the chapter is unlocked, and only at the landing', () => {
    expect(lifeHref('1986', () => false)).toBeNull()
    expect(lifeHref('1986', () => true)).toBe('/life')
    expect(lifeHref('1986', () => { throw new Error('x') })).toBeNull()
  })
})

describe('recommend()', () => {
  it('gives at most two doors, every one landing on something that exists', () => {
    const ctx = { gateId: 2, weakTopics: ['kits', 'history'], matchIds: lineupMatch ? [lineupMatch] : [], goalIds: goal ? [goal.id] : [] }
    const next = recommend(ctx)
    expect(next.length).toBeGreaterThan(0)
    expect(next.length).toBeLessThanOrEqual(2)
    for (const action of next) expect(landsOn(action), action.href).toBe(true)
    expect(recommend(ctx)).toEqual(next)
  })

  it('makes the goal the primary, and the secondary a different kind', () => {
    if (!goal) return
    const [primary, secondary] = recommend({ gateId: 10, goalIds: [goal.id], weakTopics: ['kits'] })
    expect(primary?.kind).toBe('goal')
    expect(secondary?.kind).not.toBe('goal')
  })

  it('from gate 8 turns a goal into its match’s archive card, never back into gate 8', () => {
    if (!goal) return
    const next = recommend({ gateId: 8, goalIds: [goal.id] })
    expect(next[0]?.kind).toBe('archive')
    for (const action of next) expect(action.href.startsWith('/goal')).toBe(false)
  })

  it('never recommends the asking gate’s own door', () => {
    for (const action of recommend({ gateId: 4, weakTopics: ['kits', 'history'] })) expect(action.href).not.toBe('/kits/build')
    for (const action of recommend({ gateId: 1, playerIds: ['p_0000000000'] })) expect(action.href).not.toBe('/xi')
  })

  it('never opens LIFE without the unlock check — and opens it with one', () => {
    const ctx = { gateId: 2, lifeAnchors: ['1986'] }
    expect(recommend(ctx).some((a) => a.kind === 'life')).toBe(false)
    expect(recommend(ctx, { lifeUnlocked: () => false }).some((a) => a.kind === 'life')).toBe(false)
    expect(recommend(ctx, { lifeUnlocked: (c) => c === '1986' })[0]?.href).toBe('/life')
  })

  it('does not repeat a chip the screen already shows', () => {
    const first = recommend({ gateId: 2, weakTopics: ['kits', 'history', 'derby'] })
    const again = recommend({ gateId: 2, weakTopics: ['kits', 'history', 'derby'] }, { exclude: first.map((a) => a.href) })
    for (const a of again) expect(first.map((f) => f.href)).not.toContain(a.href)
  })

  it('answers nothing rather than a guess when the run touched nothing', () => {
    expect(recommend({ gateId: 2 })).toEqual([])
  })
})

describe('the files that build hrefs', () => {
  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry)
      return statSync(path).isDirectory() ? sources(path) : path.endsWith('.ts') || path.endsWith('.tsx') ? [path] : []
    })
  }
  it('lib/results and components/result build no URL of their own — every href comes from lib/links', () => {
    for (const path of [...sources(join(ROOT, 'lib/results')), ...sources(join(ROOT, 'components/result'))]) {
      const code = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
      expect(code, path).not.toMatch(/['"`]\/(archive|goal|lineup|kits|xi|trivia|life|away-days|derby|timeline|memory|polls|blind-cow|royal-rumble)\b/)
    }
  })
  it('the exit component never imports the server-only resolver', () => {
    const exit = readFileSync(join(ROOT, 'components/result/UniversalExit.tsx'), 'utf8')
    expect(exit).not.toMatch(/from '@\/lib\/links'/)
    expect(exit).not.toMatch(/from '@\/lib\/results\/context'/)
  })
})
