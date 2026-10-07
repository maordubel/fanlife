import type { Metadata } from 'next'

import { FanPage } from '@/components/fanlife/FanPage'
import { ClosetScreen } from '@/components/fanlife/closet/ClosetScreen'
import { fanShirtMap } from '@/lib/fanlife/catalog'
import { t } from '@/lib/fanlife/i18n'

export const metadata: Metadata = { title: t('collector.closet.title'), description: t('collector.closet.seo') }
export const dynamic = 'force-dynamic'

/** My closet — The Worker's closet (app/kits/closet) for every club's shirts. */
export default async function ClosetPage() {
  const shirts = await fanShirtMap()
  return (
    <FanPage active="closet" title={t('collector.closet.title')} sub={t('collector.closet.lede')}>
      <ClosetScreen shirts={shirts} archive={Object.values(shirts)} />
    </FanPage>
  )
}
