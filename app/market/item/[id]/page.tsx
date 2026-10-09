import type { Metadata } from 'next'

import { AdoptShirts } from '@/components/fanlife/AdoptShirts'
import { FanPage } from '@/components/fanlife/FanPage'
import { ListingScreen } from '@/components/fanlife/screens/ListingScreen'
import { fanShirtMap } from '@/lib/fanlife/catalog'
import { t } from '@/lib/fanlife/i18n'

export const metadata: Metadata = { title: t('market.item.title'), description: t('market.seo.desc'), robots: { index: false, follow: true } }
export const dynamic = 'force-dynamic'

export default async function MarketItemPage({ params }: { params: { id: string } }) {
  const shirts = await fanShirtMap()
  return (
    <FanPage market active="market" title={t('market.item.title')} sub={t('market.item.sub')}>
      <AdoptShirts shirts={shirts} />
      <ListingScreen id={params.id} shirts={shirts} />
    </FanPage>
  )
}
