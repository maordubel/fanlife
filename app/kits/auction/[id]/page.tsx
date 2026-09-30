import type { Metadata } from 'next'

import { Screen } from '@/components/ui/Screen'
import { auctionShirts } from '@/lib/collector/auctionShirts'
import { t } from '@/lib/i18n'

import { LotRoom } from './LotRoom'

/**
 * לוט אחד במכירה הפומבית (מפרט §31–§39). המצב נקרא בדפדפן (`worker_auction_state`) ומתעדכן
 * כל שלוש שניות כשהלוט חי; מה שמגיע מהשרת הוא הארכיון — העונה והתצלום של הדגם.
 */
export const metadata: Metadata = {
  title: t('screen.auctionLot.title'),
  description: t('screen.auction.sub'),
}

export default function AuctionLotPage({ params }: { params: { id: string } }) {
  return (
    <Screen title={t('screen.auctionLot.title')} sub={t('screen.auction.sub')}>
      <LotRoom lotId={params.id} shirts={auctionShirts()} />
    </Screen>
  )
}
