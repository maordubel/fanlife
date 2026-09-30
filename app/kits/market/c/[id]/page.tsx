import type { Metadata } from 'next'

import { Screen } from '@/components/ui/Screen'
import { collectorShirtMap } from '@/lib/collector/catalog'
import { t } from '@/lib/i18n'

import { ThreadScreen } from './ThreadScreen'

/**
 * השיחה — `/kits/market/c/[id]`. Two people and nobody else (`worker_connection_thread` refuses a
 * third), so the page is never indexed and never cached with anyone's content in it: everything
 * but the archive shirts is read in the browser of the one looking.
 */
export const metadata: Metadata = {
  title: t('market.thread.title'),
  robots: { index: false, follow: false },
}

export default function MarketThreadPage({ params }: { params: { id: string } }) {
  return (
    <Screen title={t('market.thread.title')} sub={t('market.thread.sub')}>
      <ThreadScreen id={params.id} shirts={collectorShirtMap()} />
    </Screen>
  )
}
