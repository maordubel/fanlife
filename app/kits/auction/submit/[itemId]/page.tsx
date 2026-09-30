import type { Metadata } from 'next'

import { Screen } from '@/components/ui/Screen'
import { auctionShirts } from '@/lib/collector/auctionShirts'
import { t } from '@/lib/i18n'

import { SubmitLot } from './SubmitLot'

/**
 * "הצע למכירה פומבית" — הבקשה מהארון (מפרט §30–§32). מגיעים לכאן מהעותק בארון; המנהל מאשר
 * או דוחה, וקובע מועד. דף של אדם מחובר, ולכן לא נכנס למפת האתר.
 */
export const metadata: Metadata = {
  title: t('screen.auctionSubmit.title'),
  robots: { index: false, follow: false },
}

export default function AuctionSubmitPage({ params }: { params: { itemId: string } }) {
  return (
    <Screen title={t('screen.auctionSubmit.title')} sub={t('screen.auctionSubmit.sub')}>
      <SubmitLot itemId={params.itemId} shirts={auctionShirts()} />
    </Screen>
  )
}
