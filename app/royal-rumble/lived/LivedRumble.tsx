'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { EmptyState } from '@/components/ui/EmptyState'
import type { RoyalRumbleDraft } from '@/lib/game/royal-rumble'
import type { RoyalRumbleSelection } from '@/lib/game/royal-rumble-public'
import { t } from '@/lib/i18n'
import type { KitSpec } from '@/lib/kit/spec'
import type { Wardrobe } from '@/lib/kit/playerShirt'
import { readCompletedChapters } from '@/lib/life/memoryPassport'

import { dealLivedRumble, submitLivedRumble } from '../actions'
import { RoyalRumbleRun } from '../RoyalRumbleRun'

type Dealt = { draft: RoyalRumbleDraft; shuffleDraft: RoyalRumbleDraft }

/**
 * The themed Rumble's client half: read the chapters THIS DEVICE finished, ask the server to
 * deal over their men, and play the usual run with the themed submit. Nothing is dealt until
 * the save says a chapter is finished — before that the screen explains, and links to LIFE.
 */
export function LivedRumble({
  seed,
  cursor,
  kits,
  looks,
  playerCount,
}: {
  seed: number
  cursor: number
  kits: { seasonLabel: string; spec: KitSpec }[]
  looks: Wardrobe
  playerCount: number
}) {
  const [state, setState] = useState<'reading' | 'shut' | 'open'>('reading')
  const [chapters, setChapters] = useState<string[]>([])
  const [dealt, setDealt] = useState<Dealt | null>(null)

  useEffect(() => {
    let alive = true
    void readCompletedChapters().then(async (done) => {
      if (!alive) return
      if (done.length === 0) return setState('shut')
      const out = await dealLivedRumble(done, seed, cursor).catch(() => null)
      if (!alive) return
      if (!out) return setState('shut')
      setChapters(done)
      setDealt(out)
      setState('open')
    })
    return () => {
      alive = false
    }
  }, [seed, cursor])

  const submit = useCallback((offerSeed: number, selection: RoyalRumbleSelection[]) => submitLivedRumble(offerSeed, selection, chapters), [chapters])

  if (state === 'reading') return <p className="p-gutter font-body text-[13px] text-muted" role="status">{t('redworld.rumble.reading')}</p>
  if (state === 'shut' || !dealt) {
    return (
      <div className="mx-auto w-full max-w-xl p-gutter">
        <EmptyState title={t('redworld.rumble.title')} body={t('redworld.rumble.shut')} />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Link href="/life" className="flex min-h-tap items-center justify-center border-rule border-ink bg-ink px-3 font-body text-[13px] font-extrabold text-paper">
            {t('redworld.rumble.toLife')}
          </Link>
          <Link href="/royal-rumble" className="flex min-h-tap items-center justify-center border-rule border-ink bg-paper px-3 font-body text-[13px] font-extrabold text-ink">
            {t('redworld.rumble.toGate')}
          </Link>
        </div>
      </div>
    )
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col md:block md:flex-none">
      <p className="mx-auto mb-1.5 w-full max-w-5xl shrink-0 border-hair border-ink bg-paper px-3 py-1 font-body text-[12px] font-extrabold text-ink" data-rumble="lived">
        <span className="me-2 border-hair border-red px-1 text-red">{t('redworld.rumble.tag')}</span>
        {t('redworld.rumble.lede')}
      </p>
      <RoyalRumbleRun
        draft={dealt.draft}
        shuffleDraft={dealt.shuffleDraft}
        cursor={0}
        playerCount={playerCount}
        kits={kits}
        looks={looks}
        themed={{ submit, againHref: '/royal-rumble/lived' }}
      />
    </div>
  )
}
