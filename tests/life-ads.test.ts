import { describe, expect, it } from 'vitest'

import { AdDirector, DEFAULT_POLICY, REWARDS, allowed, noProvider } from '@/lib/life/monetization'
import type { AdProvider, AdResult, AdSession } from '@/lib/life/monetization'
import { ERA_KEYS, eraFor } from '@/lib/life/content/era'

/**
 * מונטיזציה — the promises the advertising layer makes to the game, as tests.
 *
 * Maor's plan puts revenue fifth, behind player experience, historical integrity, story
 * and retention. These are the four of those that can be checked mechanically:
 *
 *   1. an advertisement can never happen inside a master event or its aftermath;
 *   2. it can never happen often, early, or twice in a row;
 *   3. it can never break the game — every failure resolves and the story continues;
 *   4. nothing it grants is ever needed to play, to finish, or to understand.
 */

const session = (over: Partial<AdSession> = {}): AdSession => ({
  startedAt: Date.now() - 3600_000,
  interstitials: 0,
  playedSinceAd: 10_000,
  lastResult: null,
  lastSafePoint: null,
  locked: false,
  ...over,
})

describe('פרסום — מתי מותר בכלל', () => {
  it('never inside a master event or its aftermath', () => {
    const verdict = allowed(DEFAULT_POLICY, session({ locked: true }), 'chapter_completed')
    expect(verdict.show).toBe(false)
    expect(verdict.show === false && verdict.why).toBe('locked')
  })

  it('never in the first minutes of a session', () => {
    const fresh = session({ startedAt: Date.now() })
    expect(allowed(DEFAULT_POLICY, fresh, 'chapter_completed').show).toBe(false)
  })

  it('never twice without real play in between', () => {
    const justShown = session({ playedSinceAd: 0 })
    expect(allowed(DEFAULT_POLICY, justShown, 'chapter_completed').show).toBe(false)
  })

  it('never more than the session cap', () => {
    const spent = session({ interstitials: DEFAULT_POLICY.maxInterstitialsPerSession })
    expect(allowed(DEFAULT_POLICY, spent, 'chapter_completed').show).toBe(false)
  })

  it('never at a point the policy has not enabled', () => {
    // Phase 2 of the plan: one category to begin with. Half time is a safe POINT and is
    // still not an enabled one, and the difference matters.
    expect(DEFAULT_POLICY.enabledSafePoints).not.toContain('half_time')
    expect(allowed(DEFAULT_POLICY, session(), 'half_time').show).toBe(false)
  })

  it('never at all in the supporter build', () => {
    const adFree = { ...DEFAULT_POLICY, isAdFree: true }
    for (const point of DEFAULT_POLICY.enabledSafePoints) {
      expect(allowed(adFree, session(), point).show).toBe(false)
    }
  })

  it('allows exactly the case it was designed for', () => {
    expect(allowed(DEFAULT_POLICY, session(), 'chapter_completed').show).toBe(true)
  })
})

describe('פרסום — כישלון פתוח', () => {
  const brokenProvider: AdProvider = {
    id: 'broken',
    ready: () => true,
    show: async () => {
      throw new Error('ad network on fire')
    },
  }

  it('never lets an advertising exception reach the game', async () => {
    const director = new AdDirector({ provider: brokenProvider, now: Date.now() - 3600_000 })
    director.played(10_000)
    await expect(director.safePoint('chapter_completed')).resolves.toBe('failed')
    expect(director.state().interstitials).toBe(0)
  })

  it('treats no provider exactly like a provider that said no', async () => {
    const director = new AdDirector({ provider: noProvider, now: Date.now() - 3600_000 })
    director.played(10_000)
    await expect(director.safePoint('chapter_completed')).resolves.toBe('unavailable')
  })

  it('counts a shown ad, and only a shown ad, against the session', async () => {
    const good: AdProvider = { id: 'ok', ready: () => true, show: async () => 'completed' as AdResult }
    const director = new AdDirector({ provider: good, now: Date.now() - 3600_000 })
    director.played(10_000)
    await director.safePoint('chapter_completed')
    expect(director.state().interstitials).toBe(1)
    // and the very next safe point is refused, because no play has happened since
    await expect(director.safePoint('chapter_completed')).resolves.toBe('none')
  })

  it('locks and unlocks around a master event', async () => {
    const good: AdProvider = { id: 'ok', ready: () => true, show: async () => 'completed' as AdResult }
    const director = new AdDirector({ provider: good, now: Date.now() - 3600_000 })
    director.played(10_000)
    director.lock()
    await expect(director.safePoint('chapter_completed')).resolves.toBe('none')
    director.unlock()
    await expect(director.safePoint('chapter_completed')).resolves.toBe('completed')
  })
})

describe('פרס — בונוס ולא שער', () => {
  it('grants a reward only when the ad was actually watched', async () => {
    const dismissed: AdProvider = { id: 'x', ready: () => true, show: async () => 'dismissed' as AdResult }
    const director = new AdDirector({ provider: dismissed, now: Date.now() - 3600_000 })
    expect(await director.offerReward(REWARDS[0]!)).toBe(false)
  })

  it('grants it without an ad in the supporter build', async () => {
    const director = new AdDirector({ provider: noProvider, config: { isAdFree: true } })
    expect(await director.offerReward(REWARDS[0]!)).toBe(true)
  })

  it('never rewards anything the game reads', () => {
    /*
     * The hard promise of the whole layer: an advertisement may add archive material and
     * nothing else. Every reward flag starts `archive:`, and no chapter, beat, door or
     * objective in the game may ever test one — which is checked here against the real
     * content rather than asserted in a comment.
     */
    for (const reward of REWARDS) expect(reward.flag.startsWith('archive:')).toBe(true)
    const flags = new Set(REWARDS.map((one) => one.flag))
    const named: string[] = []
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object') return
      const value = node as Record<string, unknown>
      if (typeof value.flag === 'string' && flags.has(value.flag)) named.push(value.flag)
      for (const key of ['all', 'any', 'none'] as const) for (const part of (value[key] as unknown[]) ?? []) walk(part)
    }
    for (const era of ERA_KEYS.map(eraFor)) {
      for (const beat of era.beats ?? []) walk(beat.when)
    }
    expect(named, `a reward flag gates gameplay: ${named.join(', ')}`).toEqual([])
  })

  it('offers rewards only for chapters that exist', () => {
    const chapters = new Set(ERA_KEYS)
    for (const reward of REWARDS) expect(chapters.has(reward.chapter), reward.chapter).toBe(true)
  })
})
