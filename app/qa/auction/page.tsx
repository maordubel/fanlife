import { notFound } from 'next/navigation'

import { Screen } from '@/components/ui/Screen'
import { auctionShirts } from '@/lib/collector/auctionShirts'
import { qaAllowed } from '@/lib/qa'

import { AuctionQa } from './AuctionQa'
import { QA_VIEWS, type QaView } from './views'

/**
 * מתקן הבדיקה של המכירה הפומבית — כל מצב של כל מסך, על נתוני דוגמה, בלי מסד.
 *
 * `?view=board` הלוח · `lot-live` מוביל · `lot-outbid` · `lot-guest` · `lot-upcoming` ·
 * `lot-seller` · `lot-won` · `lot-completed` · `lot-ended` · `lot-photos` · `submit` · `admin`.
 * אותם רכיבים בדיוק שהאתר מריץ, מול צינור מזויף (`AuctionApiProvider`). `notFound()` באתר
 * החי, כמו כל מתקן תחת `app/qa/` (כלל 19, `tests/brand.test.ts`).
 */
export default function AuctionQaPage({ searchParams }: { searchParams: { view?: string } }) {
  if (!qaAllowed()) notFound()
  const view = (QA_VIEWS as readonly string[]).includes(searchParams.view ?? '') ? (searchParams.view as QaView) : 'board'
  const shirts = auctionShirts()
  if (view === 'admin') return <AuctionQa view={view} shirts={shirts} />
  return (
    <Screen title="המכירה הפומבית" sub="מתקן בדיקה — נתוני דוגמה">
      <AuctionQa view={view} shirts={shirts} />
    </Screen>
  )
}
