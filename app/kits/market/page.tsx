import type { Metadata } from 'next'

import { ReportLink } from '@/components/ui/ReportLink'
import { Screen } from '@/components/ui/Screen'
import { collectorShirtMap } from '@/lib/collector/catalog'
import { t } from '@/lib/i18n'
import { gateMetadata } from '@/lib/seo'

import { MarketScreen } from './MarketScreen'

/**
 * שוק האדומים — `/kits/market` (spec §12–§13, Phase 2).
 *
 * Not a `/marketplace` beside the archive (§71): the market is the archive's shirts with the copies
 * fans hold hung under them. The shirts are read here, on the server, from `lib/kit/archive.ts` and
 * the Kit Master (`collectorShirtMap`); the copies and the matches are read in the browser, because
 * they belong to whoever is looking. The page itself is static — `?slug=` is read on the client.
 */
export const metadata: Metadata = gateMetadata('kits-market')

export default function MarketPage() {
  const shirts = collectorShirtMap()
  return (
    <Screen title={t('market.title')} sub={t('market.sub')}>
      <MarketScreen shirts={shirts} />
      <ReportLink />
    </Screen>
  )
}
