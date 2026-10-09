import type { Metadata } from 'next'

import { FanPage } from '@/components/fanlife/FanPage'
import { HelpScreen } from '@/components/fanlife/market/HelpScreen'
import { fanShirtMap } from '@/lib/fanlife/catalog'
import { h } from '@/lib/fanlife/hub/copy'
import { t } from '@/lib/fanlife/i18n'

export const metadata: Metadata = { title: h('hub.help.title'), description: h('hub.help.lede') }
export const dynamic = 'force-dynamic'

/** "What shirt is this?" — collectors identify each other's finds against the archive. */
export default async function HelpPage() {
  return (
    <FanPage market active="market" title={h('hub.help.title')} sub={t('market.sub')}>
      <HelpScreen shirts={await fanShirtMap()} />
    </FanPage>
  )
}
