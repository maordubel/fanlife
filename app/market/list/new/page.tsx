import type { Metadata } from 'next'

import { FanPage } from '@/components/fanlife/FanPage'
import { ListingForm } from '@/components/fanlife/market/ListingForm'
import { fanShirtMap } from '@/lib/fanlife/catalog'
import { h } from '@/lib/fanlife/hub/copy'

export const metadata: Metadata = { title: h('listing.title'), description: h('listing.sub'), robots: { index: false } }
export const dynamic = 'force-dynamic'

/** List a shirt: any club, no closet needed. Three steps; the server publishes in one transaction. */
export default async function NewListingPage() {
  return (
    <FanPage active="market" mast="slim" title={h('listing.title')} sub={h('listing.sub')}>
      <ListingForm shirts={await fanShirtMap()} />
    </FanPage>
  )
}
