import type { Metadata } from 'next'

import { AdoptShirts } from '@/components/fanlife/AdoptShirts'
import { FanPage } from '@/components/fanlife/FanPage'
import { PublicCloset } from '@/components/fanlife/closet/PublicCloset'
import { fanShirtMap } from '@/lib/fanlife/catalog'
import { t } from '@/lib/fanlife/i18n'

export const metadata: Metadata = { title: t('collector.public.title'), robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function PublicClosetPage({ params, searchParams }: { params: { handle: string }; searchParams: { t?: string } }) {
  const handle = /^[1-9]\d{0,8}$/.test(params.handle) ? Number(params.handle) : null
  const token = typeof searchParams.t === 'string' && /^[0-9a-f]{16,64}$/i.test(searchParams.t) ? searchParams.t : null
  const shirts = await fanShirtMap()
  return (
    <FanPage title={t('collector.public.title')} sub={t('collector.public.sub')}>
      <AdoptShirts shirts={shirts} />
      <PublicCloset handle={handle} token={token} shirts={shirts} />
    </FanPage>
  )
}
