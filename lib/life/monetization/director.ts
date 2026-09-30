import { track } from '../../ads'
import { DEFAULT_POLICY, allowed, type Verdict } from './policy'
import { noProvider, providerForBuild } from './providers'
import type { AdKind, AdPolicyConfig, AdProvider, AdResult, AdSession, Reward, SafePoint } from './types'

/**
 * המנהל — the one object the game talks to, and the one that is allowed to say no.
 *
 * Everything above it — a chapter ending, a stage card, the Red Box — reports a MOMENT
 * and carries on. It never awaits an ad in a way that can block, never branches on the
 * result, and never learns which provider is behind it. That is what keeps rule 13 true:
 * if Google is missing, blocked, slow, unapproved or throwing, the game does exactly what
 * it does today.
 *
 * The lock deserves its own sentence. `lock()` is called when a master event begins and
 * released only when its whole aftermath is finished — 2.5.1998 means from the walk to
 * Bloomfield until the boy is out of the gate, Pisont and the silence included. While it
 * is on, every safe point is refused before any other rule is consulted.
 */
export class AdDirector {
  private session: AdSession
  private provider: AdProvider
  private config: AdPolicyConfig

  constructor(options: { provider?: AdProvider; config?: Partial<AdPolicyConfig>; now?: number } = {}) {
    this.provider = options.provider ?? noProvider
    this.config = { ...DEFAULT_POLICY, ...options.config }
    this.session = {
      startedAt: options.now ?? Date.now(),
      interstitials: 0,
      playedSinceAd: 0,
      lastResult: null,
      lastSafePoint: null,
      locked: false,
    }
  }

  /** the build's own provider, resolved once the page is up */
  useBuildProvider() {
    this.provider = providerForBuild()
  }

  /** game-minutes of real play, reported by the runtime clock */
  played(minutes: number) {
    this.session.playedSinceAd += Math.max(0, minutes)
  }

  /** a master event and its aftermath: nothing commercial happens inside one */
  lock() {
    this.session.locked = true
  }
  unlock() {
    this.session.locked = false
  }

  state(): Readonly<AdSession> & { provider: string; config: AdPolicyConfig } {
    return { ...this.session, provider: this.provider.id, config: this.config }
  }

  /**
   * נקודה בטוחה — the game says where it is; the director decides and does the rest.
   *
   * Returns what happened, for analytics and the debug panel. The caller is expected to
   * ignore it: there is no branch in this game whose outcome depends on an advertisement.
   */
  async safePoint(point: SafePoint): Promise<AdResult | 'none'> {
    this.session.lastSafePoint = point
    track('ad_opportunity', { point })
    const verdict: Verdict = allowed(this.config, this.session, point)
    if (!verdict.show) {
      track('ad_skipped', { point, why: verdict.why })
      return 'none'
    }
    return await this.run('interstitial', point)
  }

  /**
   * פרס — offered, never required, and refusable with no cost of any kind.
   *
   * A reward is granted on `completed` only. Everything else — dismissed, blocked, failed,
   * no provider at all — leaves the player exactly where they were, which is why the
   * caller gets a boolean rather than a promise it has to interpret.
   */
  async offerReward(reward: Reward): Promise<boolean> {
    track('reward_offered', { reward: reward.id })
    if (this.config.isAdFree) {
      // the supporter build has already paid for this; there is nothing to watch
      track('reward_granted', { reward: reward.id, via: 'ad_free' })
      return true
    }
    const result = await this.run('rewarded', this.session.lastSafePoint ?? 'chapter_completed')
    const granted = result === 'completed'
    track(granted ? 'reward_granted' : 'reward_declined', { reward: reward.id, result })
    return granted
  }

  private async run(kind: AdKind, point: SafePoint): Promise<AdResult> {
    track('ad_requested', { kind, point })
    let result: AdResult = 'failed'
    try {
      result = this.provider.ready() ? await this.provider.show(kind) : 'unavailable'
    } catch {
      // an advertising exception may never reach Phaser, React, the save or a chapter
      result = 'failed'
    }
    this.session.lastResult = result
    if (kind === 'interstitial' && (result === 'completed' || result === 'shown')) {
      this.session.interstitials += 1
      this.session.playedSinceAd = 0
    }
    track('ad_result', { kind, point, result, session: this.session.interstitials })
    return result
  }
}

/** the game's single director — created lazily so a test can always build its own */
let shared: AdDirector | null = null
export function adDirector(): AdDirector {
  if (!shared) {
    shared = new AdDirector()
    shared.useBuildProvider()
  }
  return shared
}
