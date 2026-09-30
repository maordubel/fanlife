import { notFound } from 'next/navigation'

import { Screen } from '@/components/ui/Screen'
import { collectorShirtMap } from '@/lib/collector/catalog'
import { t } from '@/lib/i18n'
import { qaAllowed } from '@/lib/qa'

import { Preview } from './Preview'
import { VIEWS, type View } from './views'

/**
 * QA only — שוק האדומים with rows, in a build that has no database.
 *
 * Same rule as the other `/qa/*` screens (rule 19): `notFound()` on the live site, the REAL
 * components (`components/market/*`, `MerchantOffersView`) fed fixture rows shaped like the SQL
 * functions' answers (`./fixtures.ts`), inside the real `<Screen>`. Every state that the empty
 * build can never show is one address away:
 *
 *   /qa/market?show=board | board-guest | board-slug | board-empty | board-off
 *                  | listing | listing-own | listing-guest | listing-archive
 *                  | thread-request | thread | thread-waiting | thread-done | shops
 */
export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  if (!qaAllowed()) notFound()
  const { show } = await searchParams
  const view: View = (VIEWS as readonly string[]).includes(show ?? '') ? (show as View) : 'board'
  const [title, sub] = view.startsWith('thread')
    ? [t('market.thread.title'), t('market.thread.sub')]
    : view.startsWith('listing')
      ? [t('market.item.title'), t('market.item.sub')]
      : [t('market.title'), t('market.sub')]
  return (
    <Screen title={title} sub={sub}>
      <Preview view={view} shirts={collectorShirtMap()} />
    </Screen>
  )
}
