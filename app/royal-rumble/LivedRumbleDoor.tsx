'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { t } from '@/lib/i18n'
import { readCompletedChapters } from '@/lib/life/memoryPassport'

import { livedRumbleOpen } from './actions'

/**
 * The door to "השנים שחיית עד עכשיו" (ONE RED WORLD §18). Drawn only when this device has
 * finished a LIFE chapter AND the server says its men can fill a board; otherwise nothing —
 * a payoff that announces itself before the story has happened is a spoiler.
 */
export function LivedRumbleDoor() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    let alive = true
    void readCompletedChapters().then(async (done) => {
      if (!alive || done.length === 0) return
      const yes = await livedRumbleOpen(done).catch(() => false)
      if (alive) setOpen(yes)
    })
    return () => {
      alive = false
    }
  }, [])
  if (!open) return null
  return (
    <Link
      href="/royal-rumble/lived"
      data-rumble="lived-door"
      className="mx-auto mb-1.5 flex min-h-tap w-full max-w-5xl shrink-0 items-center justify-between gap-2 border-hair border-ink bg-paper px-3 font-body text-[12.5px] font-extrabold text-ink"
    >
      <span>
        <span className="me-2 border-hair border-red px-1 text-red">{t('redworld.rumble.tag')}</span>
        {t('redworld.rumble.door')}
      </span>
      <span aria-hidden="true">←</span>
    </Link>
  )
}
