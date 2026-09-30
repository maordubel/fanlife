'use client'

import Link from 'next/link'

import { noteCrossLink } from '@/components/meter/GateMeter'
import { firePickFxAt } from '@/components/stage/PickFx'
import { track } from '@/lib/analytics/meter'
import { t, type MessageKey } from '@/lib/i18n'
import type { CrossLink, CrossLinkKind } from '@/lib/links/types'

/**
 * "גם בשערים אחרים" — the same man, the same match, in the other gates (delta 89).
 *
 * One line of compact chips that scrolls sideways instead of wrapping, so it never costs
 * the phone stage a second row. Each chip is a small printed tag (ארכיון · על המפה · בשער 8)
 * and the thing it opens on. The links arrive resolved and checked from the server
 * (`lib/links/index.ts`); this only draws them, fires the pick hit, and counts the click.
 */
const TAG: Record<CrossLinkKind, { key: MessageKey; plate: string }> = {
  archive: { key: 'connect.tag.archive', plate: 'bg-ink text-paper' },
  away: { key: 'connect.tag.away', plate: 'bg-sign text-paper' },
  goal: { key: 'connect.tag.goal', plate: 'bg-red text-paper' },
}

export function CrossLinks({
  links,
  from,
  className = '',
  label,
}: {
  links: readonly CrossLink[] | null | undefined
  /** the asking gate, for the measurement (`blind-cow`, `away-days`, `archive`, `goal`) */
  from: string
  className?: string
  /** an optional lead-in word on the row ("גם ב-") */
  label?: string
}) {
  if (!links || links.length === 0) return null
  return (
    <div className={`flex min-w-0 items-center gap-1.5 ${className}`}>
      {label && <span className="shrink-0 font-body text-[10px] font-extrabold tracking-widest text-sign">{label}</span>}
      <ul aria-label={t('connect.row')} className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
        {links.map((link) => {
          const tag = TAG[link.kind]
          return (
            <li key={`${link.kind}|${link.href}`} className="shrink-0">
              <Link
                href={link.href}
                data-crosslink={link.kind}
                onClick={(event) => {
                  track('cross_link_click', { detail: `${from}:${link.kind}` })
                  noteCrossLink()
                  firePickFxAt(event.currentTarget, { tone: 'ink', haptic: 'tap' })
                }}
                className="flex min-h-tap items-center gap-1.5 border-hair border-ink bg-paper pe-2.5 ps-1.5 transition-transform duration-press active:scale-[.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sign motion-reduce:transition-none"
              >
                <span className={`shrink-0 px-1 py-px font-body text-[9.5px] font-extrabold tracking-wider ${tag.plate}`}>{t(tag.key)}</span>
                {link.subject && (
                  <bdi className="max-w-[18ch] truncate font-sign text-[12.5px] leading-none text-ink">{link.subject}</bdi>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
