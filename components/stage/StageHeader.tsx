'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/Badge'
import { HelpChip } from '@/components/ui/HelpChip'
import { gateFor } from '@/lib/gates'
import { t } from '@/lib/i18n'

/**
 * כותרת הבמה — the phone header of a gate (delta 87).
 *
 * The SignPlate is a beautiful 90px of enamel, and on a 390×844 phone it is also the
 * reason the pitch did not fit. On the stage the header is one 48px row: back to the
 * wall, the gate's own number on an ink plate (the ground's number, so you always know
 * which door you came in by), the name, whatever the gate wants to show in the corner
 * (a score, a counter), and the "?". The SignPlate stays on desktop, where it has room.
 */
export function StageHeader({
  title,
  sub,
  aside,
  night = false,
}: {
  title: string
  sub?: string
  aside?: ReactNode
  /** a night screen (gate 6, the away end) — the header prints in paper on the ink */
  night?: boolean
}) {
  const pathname = usePathname() ?? ''
  const gate = gateFor(pathname) ?? gateFor('/' + (pathname.split('/')[1] ?? ''))

  return (
    <header className="relative z-10 flex h-12 shrink-0 items-center gap-2">
      <Link
        href="/"
        aria-label={t('nav.gates')}
        className={`grid h-11 w-11 shrink-0 place-items-center font-display text-[22px] leading-none ${night ? 'text-paper' : 'text-ink'} transition-transform duration-press ease-stamp active:scale-[.9] motion-reduce:transition-none`}
      >
        {/* in RTL "back" points right — the arrow is the reading direction, not a picture */}
        <span aria-hidden="true">→</span>
      </Link>
      {gate ? (
        <span className="relative grid h-10 min-w-[40px] shrink-0 place-items-center bg-ink px-1.5" aria-hidden="true">
          <span className="relative font-poster text-[26px] leading-none">
            <span className="plate-shift absolute inset-0 text-sign">{gate.number}</span>
            <span className="plate-top relative text-red">{gate.number}</span>
          </span>
        </span>
      ) : (
        <Badge size={36} className="shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <h1 className={`truncate font-sign text-[17px] leading-tight ${night ? 'text-paper' : 'text-ink'}`}>{title}</h1>
        {sub && <p className={`truncate font-body text-[10px] leading-tight ${night ? 'text-concrete' : 'text-sign'}`}>{sub}</p>}
      </div>
      {aside}
      <HelpChip compact />
    </header>
  )
}
