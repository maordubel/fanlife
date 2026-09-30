import Link from 'next/link'

import { creditsHref, type CreditGroupKey } from '@/lib/credits/groups'
import { t } from '@/lib/i18n'

/**
 * מקור מתועד — the whole of what a screen says about where a fact came from.
 *
 * Spec §0.3 (22.9.2026): credits and sources live in ONE place, `/credits`. A card, a
 * verdict, a drawer or a report that states a fact carries this and nothing else — no
 * title, no outlet, no photographer — and it links to the shelf of the page that holds
 * them all (`/credits#<group>`). The data layer keeps every `sourceTitle` it had; the
 * screen simply stops printing it.
 *
 * `newTab` is for a screen that is in the middle of something — a run, a LIFE scene, a
 * verdict — where following the link must not throw the player out of it. A reading
 * page follows it in place.
 *
 * `tone="dark"` for the few surfaces printed on ink. Tokens only (rule 8), logical
 * properties only (rule 9).
 */
export function SourceNote({
  group = null,
  newTab = false,
  tone = 'paper',
  className = '',
}: {
  group?: CreditGroupKey | null
  newTab?: boolean
  tone?: 'paper' | 'dark'
  className?: string
}) {
  const href = creditsHref(group)
  const label = t('credits.note')
  const aria = newTab ? t('credits.note.ariaTab') : t('credits.note.aria')
  // the print stays 28px tall, the TOUCH target does not: an invisible ::after grows the hit
  // area to 48px high and 8px wider on each side, at every width (WCAG 2.5.8, delta 88)
  const look = `relative inline-flex min-h-[28px] min-w-[44px] items-center justify-center after:absolute after:inset-x-[-8px] after:inset-y-[-10px] after:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red font-body text-[11.5px] font-bold leading-snug underline decoration-1 underline-offset-2 ${
    tone === 'dark' ? 'text-paper/85' : 'text-sign'
  } ${className}`

  return newTab ? (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={aria} className={look} data-source-note="">
      {label}
    </a>
  ) : (
    <Link href={href} prefetch={false} aria-label={aria} className={look} data-source-note="">
      {label}
    </Link>
  )
}
