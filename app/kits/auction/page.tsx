import type { Metadata } from 'next'

import { Screen } from '@/components/ui/Screen'
import { auctionShirts } from '@/lib/collector/auctionShirts'
import { t } from '@/lib/i18n'
import { gateMetadata } from '@/lib/seo'

import { AuctionBoard } from './AuctionBoard'

/**
 * המכירה הפומבית — לוח האירועים (מפרט §28–§29).
 *
 * לוט הוא אירוע ולא מודעה: חי עכשיו, מתחיל בעוד שלושה ימים, נסגר אתמול. הרשימה נקראת בדפדפן
 * (`worker_auction_list`), והארכיון — העונה, הסוג, התצלום — מגיע מהשרת, כי לוט מצביע על
 * `archive_slug` ולא מעתיק אותו (§72).
 */
export const metadata: Metadata = gateMetadata('kits-auction')

export default function AuctionPage() {
  return (
    <Screen title={t('screen.auction.title')} sub={t('screen.auction.sub')}>
      <AuctionBoard shirts={auctionShirts()} />
    </Screen>
  )
}
