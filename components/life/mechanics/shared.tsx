'use client'

import { useEffect, useState } from 'react'

import { t, type MessageKey } from '@/lib/i18n'
import type { ActivityId } from '@/lib/life/activities'

/**
 * The three things every life board does before the gate's board appears — ask the server
 * for the round, wait for it, and say so in the room's words when there is nothing to deal.
 * A board never guesses a round on the client (rule 4): the deal comes back from
 * `app/life/mechanicActions.ts` with the answers already stripped.
 */

export type Deal<T> = { state: 'loading' } | { state: 'empty' } | { state: 'ready'; data: T }

/** one server deal per opened sheet; a failed or empty deal is `empty`, never a spinner forever */
export function useDeal<T>(load: () => Promise<T | null | undefined>, isEmpty: (data: T) => boolean = () => false): Deal<T> {
  const [deal, setDeal] = useState<Deal<T>>({ state: 'loading' })
  useEffect(() => {
    let live = true
    load()
      .then((data) => {
        if (!live) return
        setDeal(data === null || data === undefined || isEmpty(data) ? { state: 'empty' } : { state: 'ready', data })
      })
      .catch(() => {
        if (live) setDeal({ state: 'empty' })
      })
    return () => {
      live = false
    }
    // the sheet is keyed by activity and seed, so a deal is asked for exactly once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return deal
}

/** the words on the way back into the room — one per activity, in `he.life.json` */
export function backLabel(activity: ActivityId): string {
  return t(`life.act.${activity}.back` as MessageKey)
}

export function Waiting() {
  return (
    <p className="mt-6 font-body text-[13px] text-muted" data-life="mechanic-loading">
      {t('life.act.loading')}
    </p>
  )
}

/** nothing to deal today — the way out is the same as walking away, and costs the same */
export function Nothing({ onLeave }: { onLeave: () => void }) {
  return (
    <div className="mt-6" data-life="mechanic-empty">
      <p className="font-body text-[14px] leading-snug text-ink">{t('life.act.none')}</p>
      <button
        type="button"
        onClick={onLeave}
        className="mt-4 flex min-h-tap w-full items-center justify-center border-rule border-ink bg-sheet px-4 font-body text-step-0 font-extrabold text-ink"
      >
        {t('life.act.leave')}
      </button>
    </div>
  )
}
