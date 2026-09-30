import { notFound } from 'next/navigation'

import { qaAllowed } from '@/lib/qa'

import { Preview } from './Preview'

/**
 * QA only — the packet, the red box and the album, without buying anything.
 *
 * Same rule as `/qa/life-finale` (rule 19): a screen that exists so a thing can be LOOKED
 * at, `notFound()` in production, built out of the real components with real sticker ids
 * rather than a mock. Three things are hard to reach by playing and easy to break in a
 * refactor — the tear animation, an ace coming out of the box, and a page with a torn
 * slot on it — so all three are one click away here.
 *
 *   /qa/life-album?show=packet | box | album
 */
export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  if (!qaAllowed()) notFound()
  const { show } = await searchParams
  return <Preview show={show === 'box' || show === 'album' ? show : 'packet'} />
}
