'use client'

import Image from 'next/image'
import type { CSSProperties, ReactNode } from 'react'

import { t } from '@/lib/i18n'
import { tiltOf, type SubscriptionCard } from '@/lib/life/personal'
import { artUrl } from '@/lib/life/runtime/art'
import type { ItemId } from '@/lib/life/types'

import css from './personal.module.css'

/**
 * חפצים — things you can hold, drawn in code where no photograph exists (spec §20–22).
 *
 * Paper, a hairline, a printed rule, a stamp, a date: the same material the Red Box's
 * `BoxObject` is cut from, so a ticket in the bag and a ticket in the box are one ticket.
 * Every tilt is `tiltOf(id)` — a stable hash, −2°…+2° — never `Math.random`, so the table
 * looks the same every time the bag is opened and the server renders what the client does.
 */

export function Tilted({ id, children, className = '', style }: { id: string; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={className} style={{ transform: `rotate(${tiltOf(id)}deg)`, ...style }}>
      {children}
    </div>
  )
}

/** a stub: a red band, two printed rules, the year in mono, notches cut out of the sides */
export function TicketObject({ id, yearHe, className = '' }: { id: string; yearHe?: string | null; className?: string }) {
  return (
    <Tilted id={id} className={`${css.ticket} flex h-[56px] w-[124px] bg-sheet ${className}`}>
      <span aria-hidden="true" className="w-[20%] bg-red" />
      <span aria-hidden="true" className="flex flex-1 flex-col justify-between border-e-2 border-dashed border-ink/30 px-2.5 py-2">
        <span className="block h-[2px] w-3/4 bg-ink/70" />
        <span className="block h-[2px] w-1/2 bg-ink/40" />
        {yearHe ? <span className="font-mono text-[10px] leading-none tabular-nums text-ink/70">{yearHe}</span> : <span />}
      </span>
      <span aria-hidden="true" className="w-[14%]" />
    </Tilted>
  )
}

/** a folded note: paper, two lines of pencil */
export function NoteObject({ id, className = '' }: { id: string; className?: string }) {
  return (
    <Tilted id={id} className={`flex h-[64px] w-[72px] flex-col justify-center gap-2 bg-sheet px-2.5 ${className}`}>
      <span aria-hidden="true" className="block h-[2px] w-4/5 bg-ink/55" />
      <span aria-hidden="true" className="block h-[2px] w-3/5 bg-ink/35" />
      <span aria-hidden="true" className="block h-[2px] w-2/5 bg-ink/25" />
    </Tilted>
  )
}

/** a key on a string */
export function KeyObject({ id, className = '' }: { id: string; className?: string }) {
  return (
    <Tilted id={id} className={`text-concrete ${className}`}>
      <svg viewBox="0 0 64 28" className="h-[30px] w-[70px]" aria-hidden="true">
        <circle cx="11" cy="14" r="8.5" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M19.5 14 H60 M50 14 v7 M56 14 v5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="square" />
      </svg>
    </Tilted>
  )
}

/** a glass bottle for the deposit — outline only, the glass is the table showing through */
export function BottleObject({ id, className = '' }: { id: string; className?: string }) {
  return (
    <Tilted id={id} className={`text-sheet/80 ${className}`}>
      <svg viewBox="0 0 20 56" className="h-[62px] w-[24px]" aria-hidden="true">
        <path d="M7 2 H13 V14 L17 22 V54 H3 V22 L7 14 Z" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M5 34 H15" stroke="currentColor" strokeWidth="1" opacity=".5" />
      </svg>
    </Tilted>
  )
}

/**
 * כרטיס המנוי — a card, not a line of text (§29). The club's name, the word, the season as
 * the canonical id, the gate the card itself prints, and the run said as a sentence.
 * Older seasons lie behind it, offset, one hairline each (§31).
 */
export function SubscriptionCardObject({ card, id, compact = false }: { card: SubscriptionCard; id: string; compact?: boolean }) {
  const behind = compact ? card.olderHe.slice(0, 1) : card.olderHe
  return (
    <div className="relative" style={{ paddingInlineStart: `${behind.length * 7}px`, paddingTop: `${behind.length * 5}px` }}>
      {behind.map((season, i) => (
        <span
          key={season}
          aria-hidden="true"
          className="absolute border-hair border-sheet/30 bg-ink"
          style={{
            insetInlineStart: `${(behind.length - 1 - i) * 7}px`,
            top: `${(behind.length - 1 - i) * 5}px`,
            width: compact ? 132 : 208,
            height: compact ? 78 : 118,
          }}
        />
      ))}
      <Tilted
        id={id}
        className={`relative flex flex-col justify-between border-rule border-sheet bg-sheet text-ink ${compact ? 'h-[78px] w-[132px] p-2' : 'h-[118px] w-[208px] p-3'}`}
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-[3px] border-hair border-ink/35" />
        <span className="relative flex items-start justify-between gap-2">
          <span className={`font-display leading-none text-red ${compact ? 'text-[11px]' : 'text-[14px]'}`}>
            <bdi>{t('life90h.sub.club')}</bdi>
          </span>
          <span className="bg-red px-1 py-[2px] font-sign text-[9px] leading-none text-sheet">
            <bdi>{t('life90h.sub.word')}</bdi>
          </span>
        </span>
        <span className="relative">
          <span className={`block font-poster leading-none tabular-nums ${compact ? 'text-[22px]' : 'text-[34px]'}`} dir="ltr">
            {card.seasonHe}
          </span>
          {!compact && (card.gateHe || card.categoryHe) ? (
            <span className="mt-1 block font-mono tabular-nums text-[10px] leading-none text-ink/70">
              <bdi>{[card.gateHe, card.categoryHe].filter(Boolean).join(' · ')}</bdi>
            </span>
          ) : null}
        </span>
      </Tilted>
    </div>
  )
}

/**
 * משהו שבכיס — the chapter's own drawing when it has one (a photograph of the real stub,
 * a painted coin), a drawn object when it does not. Copies are drawn, never counted.
 */
export function CarriedObject({ id, item, art, label, size = 'md' }: { id: string; item: ItemId; art: string | null; label: string; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-[60px] w-[66px]' : 'h-[76px] w-[92px]'
  if (art) {
    return (
      <Tilted id={id} className={`relative ${box}`}>
        <Image src={artUrl(art)} alt={label} fill sizes="96px" className="object-contain" />
      </Tilted>
    )
  }
  return (
    <div role="img" aria-label={label} className={`flex items-center justify-center ${box}`}>
      {item === 'house-key' ? (
        <KeyObject id={id} />
      ) : item === 'bottle' ? (
        <BottleObject id={id} />
      ) : item === 'ticket-stub' || item === 'hall-ticket' ? (
        <TicketObject id={id} />
      ) : (
        <NoteObject id={id} />
      )}
    </div>
  )
}
