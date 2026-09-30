import type { AdPolicyConfig, AdSession, SafePoint } from './types'

/**
 * המדיניות — the rules that make an ad rare, and the reasons each one exists.
 *
 * Every number is here rather than scattered through the game (the plan asks for exactly
 * that), and every one of them starts conservative. The first is the important one: a new
 * player's first minutes are clean, because the person deciding whether this game is worth
 * their evening should be deciding about the game.
 */
export const DEFAULT_POLICY: AdPolicyConfig = {
  // a chapter is roughly this long: an ad cannot land twice in one afternoon
  minMeaningfulPlayBetweenAds: 240,
  // five minutes of real play before the game asks anything of anybody
  minimumSessionAgeBeforeFirstAd: 300,
  maxInterstitialsPerSession: 3,
  masterEventCooldown: 1,
  stageTransitionAdsEnabled: true,
  isAdFree: false,
  // Phase 2 of the plan: ONE category to begin with, and it is the one that already is a
  // pause — the game has just moved the clock or closed a chapter, and nobody is mid-anything
  enabledSafePoints: ['chapter_completed', 'stage_transition'],
}

export type Verdict =
  | { show: true }
  | { show: false; why: 'ad_free' | 'not_enabled' | 'locked' | 'too_soon' | 'session_cap' | 'no_play_since' }

/**
 * מותר עכשיו? — asked at a safe point, answered without side effects.
 *
 * The order of the checks is the order of the hierarchy: the supporter build first (a
 * person who paid is never asked again), then the historical lock (a master event and its
 * aftermath are untouchable), and only then the commercial numbers.
 */
export function allowed(config: AdPolicyConfig, session: AdSession, point: SafePoint, now = Date.now()): Verdict {
  if (config.isAdFree) return { show: false, why: 'ad_free' }
  if (session.locked) return { show: false, why: 'locked' }
  if (!config.enabledSafePoints.includes(point)) return { show: false, why: 'not_enabled' }
  if (point === 'stage_transition' && !config.stageTransitionAdsEnabled) return { show: false, why: 'not_enabled' }
  if ((now - session.startedAt) / 1000 < config.minimumSessionAgeBeforeFirstAd) return { show: false, why: 'too_soon' }
  if (session.interstitials >= config.maxInterstitialsPerSession) return { show: false, why: 'session_cap' }
  if (session.playedSinceAd < config.minMeaningfulPlayBetweenAds) return { show: false, why: 'no_play_since' }
  return { show: true }
}
