import type { Metadata } from 'next'

import { FanPage } from '@/components/fanlife/FanPage'
import { SubmitLot } from '@/components/fanlife/screens/SubmitLot'
import { fanAuctionShirts } from '@/lib/fanlife/catalog'
import { t } from '@/lib/fanlife/i18n'

export const metadata: Metadata = { title: t('screen.auctionSubmit.title'), robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function AuctionSubmitPage({ params }: { params: { itemId: string } }) {
  return (
    <FanPage active="auction" title={t('screen.auctionSubmit.title')} sub={t('screen.auctionSubmit.sub')}>
      <SubmitLot itemId={params.itemId} shirts={await fanAuctionShirts()} />
    </FanPage>
  )
}
