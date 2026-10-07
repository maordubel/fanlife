import type { Metadata } from 'next'

import { FanPage } from '@/components/fanlife/FanPage'
import { LotRoom } from '@/components/fanlife/screens/LotRoom'
import { fanAuctionShirts } from '@/lib/fanlife/catalog'
import { t } from '@/lib/fanlife/i18n'

export const metadata: Metadata = { title: t('screen.auctionLot.title'), description: t('screen.auction.sub') }
export const dynamic = 'force-dynamic'

export default async function AuctionLotPage({ params }: { params: { id: string } }) {
  return (
    <FanPage active="auction" title={t('screen.auctionLot.title')} sub={t('screen.auction.sub')}>
      <LotRoom lotId={params.id} shirts={await fanAuctionShirts()} />
    </FanPage>
  )
}
