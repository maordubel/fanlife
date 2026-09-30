'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { stayedWithMeAction, type StayedRow } from '@/app/life/stayedActions'
import { t } from '@/lib/i18n'
import { readCompletedChapters } from '@/lib/life/memoryPassport'
import { activeXI } from '@/lib/xi/store'

/**
 * מה נשאר איתי (ONE RED WORLD §10) — a row in the LIFE menu, present only when there is
 * something behind it: a man in the supporter's all-time XI who belongs to a chapter this
 * device has FINISHED. The XI sheet is read here, on the client, where it lives; only its
 * refs and the finished chapter ids cross to the server. The list is archive fact — it is
 * tagged "הארכיון" and each name opens its card; no LIFE character is ever on it.
 */
export function StayedWithMe({ rowClass }: { rowClass: string }) {
  const [rows, setRows] = useState<StayedRow[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      const chapters = await readCompletedChapters()
      if (!alive || chapters.length === 0) return
      const book = await activeXI().read().catch(() => ({}))
      const best = (book as { best?: { picks?: Record<string, string>; twelfth?: string } }).best
      const refs = [...Object.values(best?.picks ?? {}), ...(best?.twelfth ? [best.twelfth] : [])].filter((v): v is string => typeof v === 'string')
      if (!alive || refs.length === 0) return
      const out = await stayedWithMeAction(chapters, refs).catch(() => [])
      if (alive) setRows(out)
    })()
    return () => {
      alive = false
    }
  }, [])

  if (rows.length === 0) return null
  return (
    <div data-life="menu-stayed">
      <button type="button" className={rowClass} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span>{t('redworld.stayed.menu')}</span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="border-b-hair border-ink/30 bg-paper px-3 py-2">
          <p className="flex items-center gap-2">
            <span className="border-hair border-ink px-1 py-px font-body text-[9.5px] font-extrabold tracking-wider text-ink">{t('bridge.tag.archive')}</span>
            <span className="font-body text-[11px] leading-snug text-muted">{t('redworld.stayed.note')}</span>
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {rows.map((row) => (
              <li key={row.id}>
                {row.href ? (
                  <Link href={row.href} className="flex min-h-tap items-center border-hair border-ink bg-sheet px-2 font-body text-[13px] font-extrabold text-ink">
                    <bdi>{row.nameHe}</bdi>
                  </Link>
                ) : (
                  <span className="flex min-h-tap items-center border-hair border-ink/40 px-2 font-body text-[13px] text-ink">
                    <bdi>{row.nameHe}</bdi>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
