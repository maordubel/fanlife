'use client'

import { useState } from 'react'

import { Num } from '@/components/ui/Num'
import { formatPrice, handleLabel } from '@/lib/collector/labels'
import { currencySymbol, offerSlipLine, offerStatusLabel, shirtName, stampTime } from '@/lib/collector/market'
import type { CollectorLabel, CollectorShirt, Offer } from '@/lib/collector/types'
import { t } from '@/lib/i18n'

import { ArchivePhoto, Kicker, PlateHeading } from './ShirtBits'

const STAMP_TONE: Record<Offer['status'], string> = {
  open: 'border-sign text-sign',
  accepted: 'border-red text-red',
  declined: 'border-ink text-ink',
  countered: 'border-ink/60 text-muted',
  withdrawn: 'border-ink/60 text-muted',
  superseded: 'border-ink/60 text-muted',
}

/**
 * פתק הצעה (מפרט §17) — "אספן #N הציע ₪250", printed as a ticket torn off a pad: the sender and
 * the verb, the amount in the poster face in two plates, the shirts of a trade, and a rubber stamp
 * with where the offer stands. The one answering it gets קבל / דחה / הצע ₪ אחר on the slip itself.
 * Nothing on it is a payment: there is no pay button anywhere in the market (§17, §39).
 */
export function OfferSlip({
  offer,
  by,
  shirts,
  forShirt,
  canAnswer,
  canCounter,
  busy,
  onAccept,
  onDecline,
  onCounter,
}: {
  offer: Offer
  by: 'me' | CollectorLabel
  shirts: Readonly<Record<string, CollectorShirt>>
  /** the copy the conversation is about — what a trade is offered FOR */
  forShirt: CollectorShirt | null
  canAnswer: boolean
  canCounter: boolean
  busy: boolean
  onAccept: () => void
  onDecline: () => void
  onCounter: (amount: number) => Promise<boolean>
}) {
  const [countering, setCountering] = useState(false)
  const [amount, setAmount] = useState('')
  const line = offerSlipLine(offer, by === 'me' ? 'me' : by)
  const who = by === 'me' ? t('market.offer.by.mine') : t('market.offer.by.theirs', { who: handleLabel(by) })
  const dead = offer.status !== 'open' && offer.status !== 'accepted'

  return (
    <article
      className={`relative w-full max-w-[380px] self-center border-rule border-ink bg-paper ${dead ? 'opacity-70' : ''}`}
      data-offer-slip={offer.status}
    >
      <div className="flex items-center justify-between gap-3 border-b-hair border-dashed border-ink/60 px-3 py-1.5">
        <Kicker>{t('market.offer.kicker')}</Kicker>
        <span className="font-body text-[10.5px] text-muted">
          <Num>{stampTime(offer.createdAt)}</Num>
        </span>
      </div>
      <div className="px-3 pb-3 pt-2">
        <p className="sr-only">{line}</p>
        <p aria-hidden="true" className="font-body text-[13px] font-extrabold text-ink">
          <bdi>{who}</bdi>
        </p>
        {offer.kind === 'price' && offer.amount !== null ? (
          <div aria-hidden="true" className="mt-1">
            <PlateHeading as="p" className="text-[46px] sm:text-[54px]">
              <Num>{formatPrice(offer.amount, offer.currency)}</Num>
            </PlateHeading>
          </div>
        ) : (
          <div className="mt-2">
            <ul className="flex flex-wrap gap-2">
              {offer.items.map((row) => {
                const shirt = shirts[row.archiveSlug]
                return (
                  <li key={row.id} className="w-[88px]">
                    <span className="block border-hair border-ink/40 bg-sheet p-1">{shirt ? <ArchivePhoto shirt={shirt} /> : null}</span>
                    <span className="mt-0.5 block font-body text-[10.5px] font-bold leading-tight text-ink">{shirtName(shirt)}</span>
                  </li>
                )
              })}
            </ul>
            {forShirt ? (
              <p className="mt-2 font-body text-[11.5px] text-muted">
                {t('market.offer.trade.for')} <span className="font-extrabold text-ink">{shirtName(forShirt)}</span>
              </p>
            ) : null}
          </div>
        )}
      </div>

      <span
        className={`pointer-events-none absolute end-3 top-9 border-stamp bg-paper/80 px-2 py-0.5 font-sign text-[15px] leading-none ${STAMP_TONE[offer.status]}`}
        style={{ transform: 'rotate(-8deg)' }}
      >
        {offerStatusLabel(offer.status)}
      </span>

      {canAnswer && offer.status === 'open' ? (
        <div className="border-t-hair border-dashed border-ink/60 p-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onAccept}
              className="min-h-tap min-w-[5.5rem] flex-1 whitespace-nowrap border-rule border-ink bg-red px-3 font-body text-step--1 font-extrabold text-paper disabled:opacity-60"
            >
              {t('market.act.accept')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onDecline}
              className="min-h-tap min-w-[5.5rem] flex-1 whitespace-nowrap border-rule border-ink bg-sheet px-3 font-body text-step--1 font-extrabold text-ink disabled:opacity-60"
            >
              {t('market.act.decline')}
            </button>
            {canCounter ? (
              <button
                type="button"
                disabled={busy}
                aria-expanded={countering}
                onClick={() => setCountering((open) => !open)}
                className="min-h-tap min-w-[5.5rem] flex-1 whitespace-nowrap border-rule border-dashed border-ink bg-paper px-3 font-body text-step--1 font-extrabold text-ink disabled:opacity-60"
              >
                {offer.currency === 'ILS' ? t('market.act.counter') : t('market.act.counterOther')}
              </button>
            ) : null}
          </div>
          {countering ? (
            <form
              className="mt-2 flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                const value = Number(amount)
                if (!(value > 0) || busy) return
                void onCounter(value).then((ok) => {
                  if (ok) {
                    setCountering(false)
                    setAmount('')
                  }
                })
              }}
            >
              <label className="min-w-0 flex-1 font-body text-[12px] font-extrabold text-ink">
                {t('market.offerForm.counterTitle')}
                <span className="mt-1 flex items-center border-rule border-ink bg-sheet">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={1}
                    step="any"
                    required
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    dir="ltr"
                    className="min-h-tap w-full bg-transparent px-2 font-poster text-[22px] text-ink"
                  />
                  <span className="px-2 font-poster text-[20px] text-muted">{currencySymbol(offer.currency)}</span>
                </span>
              </label>
              <button
                type="submit"
                disabled={busy}
                className="min-h-tap border-rule border-ink bg-ink px-4 font-body text-step--1 font-extrabold text-paper disabled:opacity-60"
              >
                {t('market.offerForm.send')}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
