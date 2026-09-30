'use client'

import { useState } from 'react'

import { dealLifeArchive, readLifeClipping } from '@/app/life/mechanicActions'
import { CardHeadline, EntityRow } from '@/components/archive/EntityCard'
import type { ActivityBoardProps } from '@/components/life/MechanicSheet'
import { Num } from '@/components/ui/Num'
import type { ArchiveCard, WhatBlock } from '@/lib/archive/graph-types'

import { Nothing, Waiting, backLabel, useDeal } from './shared'

type Opened = { card: ArchiveCard; what: WhatBlock | null }

/**
 * ערימת העיתונים — six things off the archive's table, cut to what a boy could have found in
 * a pile of old papers at home, dated before the year; one opened reads its own words and
 * nothing that reaches past the year. An explore mechanic: nothing is graded, and reading
 * one is what the pile is for.
 */
export default function LifeArchive({ request, onResult }: ActivityBoardProps) {
  const deal = useDeal(() => dealLifeArchive(request.seed, request.window), (cards) => cards.length === 0)
  const [open, setOpen] = useState<Opened | null>(null)
  const [read, setRead] = useState<string[]>([])

  if (deal.state === 'loading') return <Waiting />
  if (deal.state === 'empty') return <Nothing onLeave={() => onResult({ completed: false, score: 0 })} />

  async function pick(card: ArchiveCard) {
    const got = await readLifeClipping(card.id, request.window)
    setOpen(got ?? { card, what: null })
    setRead((current) => (current.includes(card.id) ? current : [...current, card.id]))
  }

  return (
    <div className="mt-3" data-life="archive">
      <ul className="grid gap-1.5">
        {deal.data.map((card) => (
          <li key={card.id}>
            <EntityRow card={card} onPick={() => void pick(card)} selected={open?.card.id === card.id} />
          </li>
        ))}
      </ul>

      {open && (
        <article className="mt-3 border-rule border-ink bg-sheet px-3 py-2.5" data-life="clipping">
          <CardHeadline card={open.card} className="block font-sign text-step-1 leading-tight text-ink" />
          {open.what?.kind === 'text' && <p className="mt-1.5 font-body text-[13px] leading-relaxed text-ink">{open.what.text}</p>}
          {open.what?.kind === 'quote' && (
            <>
              {open.what.quote && (
                <blockquote className="mt-1.5 border-s-rule border-red ps-2 font-body text-[13px] leading-relaxed text-ink">
                  {open.what.quote}
                </blockquote>
              )}
              <p className="mt-1 font-body text-[11px] text-muted">{open.what.byline}</p>
            </>
          )}
          {open.what?.kind === 'match' && (
            <p className="mt-1.5 font-body text-[12.5px] leading-snug text-ink">
              <bdi>{open.what.competitionHe}</bdi>
              {open.what.venueHe && <> · <bdi>{open.what.venueHe}</bdi></>}
              {open.what.day && (
                <>
                  {' · '}
                  <Num>{open.what.day}</Num>
                </>
              )}
            </p>
          )}
        </article>
      )}

      <button
        type="button"
        onClick={() => onResult({ completed: true, score: 1, answer: read.join('|') || null })}
        disabled={read.length === 0}
        data-life="archive-back"
        className="mt-3 flex min-h-tap w-full items-center justify-center bg-red px-4 font-body text-step-0 font-extrabold text-paper disabled:opacity-40"
      >
        {backLabel(request.activity)}
      </button>
    </div>
  )
}
