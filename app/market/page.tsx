import type { Metadata } from 'next'

import { FanPage } from '@/components/fanlife/FanPage'
import { MarketScreen } from '@/components/fanlife/screens/MarketScreen'
import { fanShirtMap } from '@/lib/fanlife/catalog'
import { t } from '@/lib/fanlife/i18n'

export const metadata: Metadata = { title: t('market.title'), description: t('market.seo.desc') }
export const dynamic = 'force-dynamic'

/** The Shirt Market — swap, buy and sell between supporters, no fee (The Worker's market, every club). */
export default async function MarketPage() {
  return (
    <FanPage active="market" title={t('market.title')} sub={t('market.sub')}>
      <MarketScreen shirts={await fanShirtMap()} />
    </FanPage>
  )
}
