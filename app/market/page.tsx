import type { Metadata } from 'next'

import { FanPage } from '@/components/fanlife/FanPage'
import { HubScreen } from '@/components/fanlife/market/HubScreen'
import { fanShirtMap } from '@/lib/fanlife/catalog'
import { h } from '@/lib/fanlife/hub/copy'
import { t } from '@/lib/fanlife/i18n'

export const metadata: Metadata = { title: t('market.title'), description: t('market.seo.desc') }
export const dynamic = 'force-dynamic'

/** The Shirt Hub — a market you can search, a wanted board and saved searches; swap, buy and sell between supporters, no fee (The Worker's collector database, every club). */
export default async function MarketPage() {
  return (
    <FanPage active="market" mast="full" spread title={h('hub.hero.title')} sub={h('hub.hero.sub')} kicker={h('hub.hero.kicker')}>
      <HubScreen shirts={await fanShirtMap()} />
    </FanPage>
  )
}
