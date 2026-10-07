import type { Metadata } from 'next'

import { FanPage } from '@/components/fanlife/FanPage'
import { ThreadScreen } from '@/components/fanlife/screens/ThreadScreen'
import { fanShirtMap } from '@/lib/fanlife/catalog'
import { t } from '@/lib/fanlife/i18n'

export const metadata: Metadata = { title: t('market.thread.title'), robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function MarketThreadPage({ params }: { params: { id: string } }) {
  return (
    <FanPage active="market" title={t('market.thread.title')} sub={t('market.thread.sub')}>
      <ThreadScreen id={params.id} shirts={await fanShirtMap()} />
    </FanPage>
  )
}
