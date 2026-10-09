import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { FanPage } from '@/components/fanlife/FanPage'
import { CircleScreen } from '@/components/fanlife/market/CircleScreen'
import { fanShirtMap } from '@/lib/fanlife/catalog'
import { h } from '@/lib/fanlife/hub/copy'
import { t } from '@/lib/fanlife/i18n'

export const metadata: Metadata = { title: h('hub.circles.title'), description: t('market.seo.desc'), robots: { index: false, follow: true } }
export const dynamic = 'force-dynamic'

const KINDS = ['club', 'country', 'city'] as const

/** One circle — a club, a country or a city — and the shirts that are open in it. */
export default async function CirclePage({ params }: { params: { kind: string; key: string } }) {
  if (!(KINDS as readonly string[]).includes(params.kind)) notFound()
  return (
    <FanPage active="market" title={h('hub.circles.title')} sub={t('market.sub')}>
      <CircleScreen kind={params.kind as (typeof KINDS)[number]} keyId={decodeURIComponent(params.key)} shirts={await fanShirtMap()} />
    </FanPage>
  )
}
