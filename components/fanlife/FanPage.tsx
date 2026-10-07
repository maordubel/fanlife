import Link from 'next/link'
import type { ReactNode } from 'react'

import { Shell } from '@/components/master/Shell'
import { fl } from '@/lib/fanlife/copy'
import { evaluationMode } from '@/lib/master/mode'

export type CornerTab = 'me' | 'file' | 'closet' | 'market' | 'auction' | 'shirts'
const TABS: { key: CornerTab; href: string; label: Parameters<typeof fl>[0] }[] = [
  { key: 'me', href: '/me', label: 'corner.me' },
  { key: 'file', href: '/me/file', label: 'corner.file' },
  { key: 'closet', href: '/closet', label: 'corner.closet' },
  { key: 'market', href: '/market', label: 'corner.market' },
  { key: 'auction', href: '/auction', label: 'corner.auction' },
  { key: 'shirts', href: '/shirts', label: 'corner.shirts' },
]

/**
 * The frame of every page in "your corner" (the personal area ported from The Worker, 7.10.2026):
 * the magazine Shell, a kicker + headline, the corner's tabs, and `.fl-worker` — the surface that
 * re-inks The Worker's components (their Tailwind tokens) in the magazine's paper and inks.
 */
export function FanPage({ active, title, sub, children }: { active?: CornerTab; title: string; sub?: string; children: ReactNode }) {
  return (
    <Shell locale="en">
      <main id="main" className="mag-section fl-corner">
        <hr className="mag-rule" />
        <div className="mag-head"><div><p className="mag-kicker">{fl('corner.kicker')}</p><h1 className="mag-h2">{title}</h1>{sub ? <p className="mag-fine">{sub}</p> : null}</div></div>
        <nav className="fl-corner-tabs" aria-label={fl('corner.nav')}>
          {TABS.map((tab) => <Link key={tab.key} href={tab.href} aria-current={tab.key === active ? 'page' : undefined}>{fl(tab.label)}</Link>)}
        </nav>
        {evaluationMode() ? <p className="fl-corner-note">{fl('corner.preview')}</p> : null}
        <div className="fl-worker" dir="ltr" lang="en">{children}</div>
      </main>
    </Shell>
  )
}
