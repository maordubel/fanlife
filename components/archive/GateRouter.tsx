'use client'

import Link from 'next/link'

import { firePickFxAt } from '@/components/stage/PickFx'
import { track } from '@/lib/analytics/meter'
import type { EntityDetail } from '@/lib/archive/graph-types'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * מכאן לשערים — the Cross Gate Router on an entity page (ONE RED WORLD §21, §23.2).
 *
 * The actions arrive resolved and checked by the server (`lib/links/actions.ts`): each one
 * exists only because its gate can serve this entity. The LIFE door is the one thing the
 * server cannot decide — it depends on THIS device's save — so it is drawn only when one of
 * the entity's chapters is in `lived` (the completed chapters the save holds). It never
 * names a chapter the player has not reached.
 *
 * Story and archive are visibly different (§21, §52): the gates sit on the archive's own
 * printed plates; the LIFE door is set apart, dashed, and labelled "הסיפור" — fiction the
 * player lived, not a sourced fact about the match.
 */
export function GateRouter({ router, lived }: { router: EntityDetail['router']; lived: readonly string[] }) {
  const actions = router?.actions ?? []
  const chapter = (router?.lifeChapters ?? []).find((id) => lived.includes(id)) ?? null
  if (actions.length === 0 && !chapter) return null
  return (
    <section className="mt-2.5" aria-labelledby="drawer-router" data-archive="router">
      <h3 id="drawer-router" className="font-body text-[10px] font-extrabold tracking-widest text-sign">
        {t('router.title')}
      </h3>
      {actions.length > 0 && (
        <ul className="-mx-1 mt-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
          {actions.map((action) => (
            <li key={action.href} className="shrink-0">
              <Link
                href={action.href}
                data-router={action.kind}
                onClick={(event) => {
                  track('entity_follow', { detail: `archive:${action.kind}` })
                  firePickFxAt(event.currentTarget, { tone: 'ink', haptic: 'tap' })
                }}
                className="flex min-h-tap items-center gap-1.5 border-hair border-ink bg-paper pe-2.5 ps-1.5 transition-transform duration-press active:scale-[.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sign motion-reduce:transition-none"
              >
                <span className="shrink-0 bg-ink px-1 py-px font-mono text-[10px] font-bold tabular-nums text-paper">{action.gate}</span>
                <span className="font-body text-[12.5px] font-extrabold leading-none text-ink">{t(action.label as MessageKey)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {chapter && (
        <Link
          href="/life"
          data-archive="lived"
          onClick={(event) => {
            track('entity_follow', { detail: 'archive:life' })
            firePickFxAt(event.currentTarget, { tone: 'ink', haptic: 'tap' })
          }}
          className="mt-2 flex min-h-tap items-center gap-2 border-hair border-dashed border-sign bg-sheet px-2.5 py-1.5 transition-transform duration-press active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sign motion-reduce:transition-none"
        >
          <span className="shrink-0 border-hair border-sign px-1 py-px font-body text-[9.5px] font-extrabold tracking-wider text-sign">{t('bridge.tag.story')}</span>
          <span className="min-w-0">
            <span className="block font-body text-[13px] font-extrabold leading-tight text-ink">{t('bridge.lived')}</span>
            <span className="block font-body text-[11px] leading-snug text-muted">{t('bridge.lived.note')}</span>
          </span>
        </Link>
      )}
    </section>
  )
}
