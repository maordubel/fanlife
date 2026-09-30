import type { Metadata } from 'next'

import { Screen } from '@/components/ui/Screen'
import { collectorShirtMap } from '@/lib/collector/catalog'
import { t } from '@/lib/i18n'

import { ListingScreen } from './ListingScreen'

/**
 * עותק על השולחן — `/kits/market/item/[id]`. The copy is read in the browser (`marketItem`), the
 * shirt it is a copy of on the server. Not in the sitemap and not indexed: a copy is somebody's
 * object and leaves the table the day it is sold.
 */
export const metadata: Metadata = {
  title: t('market.item.title'),
  description: t('market.seo.desc'),
  robots: { index: false, follow: true },
}

export default function MarketItemPage({ params }: { params: { id: string } }) {
  return (
    <Screen title={t('market.item.title')} sub={t('market.item.sub')}>
      <ListingScreen id={params.id} shirts={collectorShirtMap()} />
    </Screen>
  )
}
