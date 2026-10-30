import type { Metadata } from 'next'

import { FanPage } from '@/components/fanlife/FanPage'
import { MyListings } from '@/components/fanlife/market/MyListings'
import { fanShirtMap } from '@/lib/fanlife/catalog'
import { h } from '@/lib/fanlife/hub/copy'

export const metadata: Metadata = { title: h('mine.title'), description: h('mine.sub'), robots: { index: false } }
export const dynamic = 'force-dynamic'

/** My listings: what I have on offer, whether or not it is in my closet. */
export default async function MyListingsPage() {
  return (
    <FanPage active="market" mast="slim" title={h('mine.title')} sub={h('mine.sub')}>
      <MyListings shirts={await fanShirtMap()} />
    </FanPage>
  )
}
