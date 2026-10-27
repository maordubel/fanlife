import { notFound } from 'next/navigation'

import { Shell } from '@/components/master/Shell'
import { qaAllowed } from '@/lib/qa'

import { Stand } from './Stand'

/**
 * QA only — the match highlights frame by frame (`notFound()` in production, like every page under /qa).
 * `?shape=<index>` picks a scene; `?play=1` runs the whole theatre. The contact sheet draws each scene at the kick, the decisive
 * moment and after it, so proportions (the bar against the men, a header at head height, the far touchline smaller) can be read
 * off a still.
 */
export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<{ shape?: string; play?: string; w?: string }> }) {
  if (!qaAllowed()) notFound()
  const sp = await searchParams
  return <Shell><Stand shape={sp.shape === undefined ? null : Number(sp.shape)} play={sp.play === '1'} narrow={sp.w === 'narrow'} /></Shell>
}
