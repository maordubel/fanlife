import Link from 'next/link'

import { t } from '@/lib/i18n'

/**
 * שני המשחקים של שער 13 (owner decision, 21.9.2026): the Red Thread is the gate's game at
 * `/timeline`; the chronology game stays as a second mode at `/timeline/order`. Two links,
 * not a toggle — each mode is its own route with its own round.
 */
export function ThreadTabs({ active }: { active: 'thread' | 'order' }) {
  const tab = (href: string, on: boolean, label: string) => (
    <Link
      href={href}
      aria-current={on ? 'page' : undefined}
      className={`flex min-h-tap flex-1 items-center justify-center border-rule px-3 font-body text-[13.5px] font-extrabold ${
        on ? 'border-red bg-red text-paper' : 'border-ink/40 bg-sheet text-ink'
      }`}
    >
      {label}
    </Link>
  )
  return (
    <nav aria-label={t('thread.modes.aria')} className="flex gap-1.5">
      {tab('/timeline', active === 'thread', t('thread.modes.thread'))}
      {tab('/timeline/order', active === 'order', t('thread.modes.order'))}
    </nav>
  )
}
