import type { Metadata } from 'next'

import { FanPage } from '@/components/fanlife/FanPage'
import { AuctionBoard } from '@/components/fanlife/screens/AuctionBoard'
import { fanAuctionShirts } from '@/lib/fanlife/catalog'
import { t } from '@/lib/fanlife/i18n'

export const metadata: Metadata = { title: t('screen.auction.title'), description: t('screen.auction.sub') }
export const dynamic = 'force-dynamic'

/** The auction — one shirt, one time window, one winner (The Worker's auction, every club). */
export default async function AuctionPage() {
  return (
    <FanPage active="auction" title={t('screen.auction.title')} sub={t('screen.auction.sub')}>
      <AuctionBoard shirts={await fanAuctionShirts()} />
    </FanPage>
  )
}
