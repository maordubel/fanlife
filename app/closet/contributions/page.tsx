import type { Metadata } from 'next'

import { FanPage } from '@/components/fanlife/FanPage'
import { Contributions } from '@/components/fanlife/closet/Contributions'
import { fl } from '@/lib/fanlife/copy'

export const metadata: Metadata = { title: fl('contrib.title'), robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/** Per-photo consent: archive use, promotion, credit. Private to the signed-in collector. */
export default function ContributionsPage() {
  return (
    <FanPage active="closet" title={fl('contrib.title')} sub={fl('contrib.lede')}>
      <p className="mb-4"><a href="/closet" className="inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-sign underline underline-offset-4">{fl('contrib.back')}</a></p>
      <Contributions />
    </FanPage>
  )
}
