import { ADSENSE_CLIENT } from '../../ads'
import type { AdKind, AdProvider, AdResult } from './types'

/**
 * הספקים — one that does nothing, and one that asks Google.
 *
 * The null provider is not a placeholder. It is what ships until the H5 Games Ads account
 * is actually approved, what a development build uses, and what every failure degrades
 * INTO: `AdDirector` never distinguishes "no provider" from "provider said no", so a game
 * with advertising switched off and a game whose ad failed to load behave identically.
 * That is rule 13 of the plan — fail OPEN, never closed.
 */
export const noProvider: AdProvider = {
  id: 'none',
  ready: () => false,
  show: async () => 'unavailable' as AdResult,
}

/** how long Google is given to answer before the game stops caring */
const TIMEOUT_MS = 4000

type AdBreak = (options: Record<string, unknown>) => void

/**
 * Google's H5 Games Ad Placement API, wrapped so that nothing above it can be hurt by it.
 *
 * Three guarantees, and they are the reason this file is not an inline `adBreak()` call:
 *
 *   1. **It always resolves.** A missing script, an ad blocker, a thrown exception inside
 *      Google's own callback, a network that never answers — every one of them lands on
 *      the same resolved promise with a result the director can log.
 *   2. **It resolves quickly.** Four seconds, then the game continues whatever Google is
 *      doing. Nobody waits for an advertisement to decide whether the story may go on.
 *   3. **It knows it might not be approved.** `ready()` is false until the API is actually
 *      on the page, so an unapproved account produces the null provider's behaviour rather
 *      than a broken screen.
 */
export function googleH5Provider(): AdProvider {
  return {
    id: 'google-h5',
    ready() {
      if (typeof window === 'undefined') return false
      return typeof (window as unknown as { adBreak?: AdBreak }).adBreak === 'function'
    },
    async show(kind: AdKind): Promise<AdResult> {
      if (typeof window === 'undefined') return 'unavailable'
      const adBreak = (window as unknown as { adBreak?: AdBreak }).adBreak
      if (typeof adBreak !== 'function') return 'unavailable'
      return await new Promise<AdResult>((resolve) => {
        let settled = false
        const finish = (result: AdResult) => {
          if (settled) return
          settled = true
          resolve(result)
        }
        const timer = window.setTimeout(() => finish('failed'), TIMEOUT_MS)
        try {
          adBreak({
            type: kind === 'rewarded' ? 'reward' : 'next',
            name: kind === 'rewarded' ? 'archive-extra' : 'chapter-transition',
            adBreakDone: (placement: { breakStatus?: string }) => {
              window.clearTimeout(timer)
              const status = placement?.breakStatus
              if (status === 'viewed') finish('completed')
              else if (status === 'dismissed') finish('dismissed')
              else if (status === 'notReady' || status === 'timeout') finish('unavailable')
              else if (status === 'frequencyCapped' || status === 'ignored') finish('skipped_by_policy')
              else finish('failed')
            },
          })
        } catch {
          window.clearTimeout(timer)
          finish('failed')
        }
      })
    },
  }
}

/**
 * הדגלים — advertising is off unless the build says otherwise, and off again in test mode
 * for anything that would produce a real impression.
 *
 * `NEXT_PUBLIC_ADS_ENABLED` is the switch the plan asks for. It is deliberately opt-IN:
 * until the H5 Games account is approved, a build that shipped with it on would be
 * producing impressions nobody authorised.
 */
export const adsEnabled = () => process.env.NEXT_PUBLIC_ADS_ENABLED === '1'
export const adsTestMode = () => process.env.NEXT_PUBLIC_ADS_TEST_MODE === '1'

/** the publisher account, from the one place it is written down */
export const publisherId = ADSENSE_CLIENT

/** whichever provider this build should use — never throws, never null */
export function providerForBuild(): AdProvider {
  if (!adsEnabled()) return noProvider
  const google = googleH5Provider()
  return google.ready() ? google : noProvider
}
