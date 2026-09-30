'use client'

import Link from 'next/link'
import { useState } from 'react'

import {
  bidderLabel,
  bidTimeText,
  checkBid,
  endsInLabel,
  inSnipeWindow,
  livePhase,
  lotPanels,
  msToNext,
  quickBids,
  shirtSeason,
  snipeWindowText,
  startsInLabel,
  whenText,
  auctionErrorLabel,
  type AuctionShirt,
  type BidCheck,
} from '@/lib/collector/auction'
import { formatPrice } from '@/lib/collector/labels'
import type { Fail, LotPhase, LotState } from '@/lib/collector/types'
import { t } from '@/lib/i18n'
import { CollectorTag } from '@/components/collector/CollectorTag'
import { DonationCard } from '@/components/collector/DonationCard'
import { ItemFacts } from '@/components/collector/ItemFacts'
import { SignInPrompt } from '@/components/collector/SignInPrompt'
import { SafetyLinks, SafetySheet } from '@/components/market/SafetySheet'
import { Num } from '@/components/ui/Num'

import { Countdown } from './Countdown'
import { PaymentNote } from './PaymentNote'
import { PhaseStamp } from './PhaseStamp'
import { ReasonDialog } from './ReasonDialog'
import { ReserveLine } from './ReserveLine'
import { ShirtPicture } from './ShirtPicture'

export type LotActions = {
  bid: (max: number) => Promise<Fail | null>
  watch: (on: boolean) => Promise<Fail | null>
  remind: () => void
  complete: () => Promise<Fail | null>
  withdraw: () => Promise<Fail | null>
}

/**
 * הלוט — כרזה של יום משחק ולא דף מוצר. מלמעלה: העונה בגדול, הכותרת והשעון. מתחת, בטלפון
 * אחד אחרי השני ובמחשב זה לצד זה: עמודת התמונות, ועמודת ההצעות.
 *
 * מה מוצג לכל אחד נקבע ב-`lotPanels` ולא כאן — ובמיוחד: **למוכר אין טופס הצעה**. המסד מסרב
 * ממילא (`own_lot`), אבל מסך שמציע כפתור שתמיד ייכשל הוא מסך שמשקר (מפרט §38).
 */
export function LotView({
  state,
  now,
  signedIn,
  shirt,
  actions,
  notice,
}: {
  state: LotState
  now: number
  signedIn: boolean
  shirt: AuctionShirt | undefined
  actions: LotActions
  notice?: string | null
}) {
  const { lot, item, bids } = state
  const phase = livePhase(lot, now)
  const panels = lotPanels(state, now, signedIn)
  const remaining = msToNext(lot, now)
  // דווח · חסום (מפרט §21) — on a lot too: a report reaches the team with the lot it is about
  const [sheet, setSheet] = useState<'report' | 'block' | null>(null)
  return (
    <article className="mt-stack" data-lot-room={phase} data-seller={lot.isSeller ? 'yes' : 'no'}>
      <PosterHead state={state} shirt={shirt} phase={phase} remaining={remaining} now={now} />
      {notice ? (
        <p role="status" className="mt-3 border-rule border-sign bg-sheet px-3 py-2 font-body text-step--1 font-extrabold text-sign">
          {notice}
        </p>
      ) : null}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start lg:gap-8">
        <div className="flex flex-col gap-4 md:sticky md:top-4">
          <Gallery photos={item.photos} shirt={shirt} />
          <ArchiveLinks shirt={shirt} slug={lot.archiveSlug} />
        </div>
        <div className="flex flex-col gap-5">
          <PriceBoard state={state} phase={phase} />
          {panels.bidForm ? <BidForm state={state} now={now} onBid={actions.bid} /> : null}
          {panels.signInToBid ? <SignInPrompt /> : null}
          {panels.watch || panels.remind ? <Follow state={state} signedIn={signedIn} panels={panels} actions={actions} /> : null}
          {panels.sellerPanel ? <SellerPanel state={state} phase={phase} withdraw={panels.withdraw} onWithdraw={actions.withdraw} /> : null}
          <Aftermath state={state} phase={phase} canComplete={panels.complete} donation={panels.donation} onComplete={actions.complete} />
          <BidHistory bids={bids} now={now} currency={lot.currency} />
          <section aria-labelledby="lot-item" className="border-t-plate border-ink pt-4">
            <h3 id="lot-item" className="font-display text-step-2 leading-tight text-ink">
              {t('auction.item.title')}
            </h3>
            <div className="mt-2">
              <ItemFacts item={item} showPrice={false} />
            </div>
            <p className="mt-3 whitespace-pre-line font-body text-step-0 leading-relaxed text-ink">
              <bdi>{lot.description}</bdi>
            </p>
            {item.seller ? (
              <p className="mt-3 flex flex-wrap items-baseline gap-2 font-body text-step--1 text-muted">
                {t('auction.item.seller')}
                <CollectorTag label={item.seller} />
              </p>
            ) : null}
            <p className="mt-3 font-body text-[11.5px] leading-snug text-muted">{t('collector.claim.note')}</p>
            {signedIn && !lot.isSeller && item.seller ? (
              <div className="mt-2" data-lot-safety="">
                <SafetyLinks onReport={() => setSheet('report')} onBlock={() => setSheet('block')} />
              </div>
            ) : null}
          </section>
          <PaymentNote />
        </div>
      </div>
      {sheet && item.seller ? (
        <SafetySheet mode={sheet} who={item.seller} target={{ lotId: lot.id }} onClose={() => setSheet(null)} />
      ) : null}
    </article>
  )
}

// ---------------------------------------------------------------- the poster at the top
function PosterHead({
  state,
  shirt,
  phase,
  remaining,
  now,
}: {
  state: LotState
  shirt: AuctionShirt | undefined
  phase: LotPhase
  remaining: number | null
  now: number
}) {
  const { lot } = state
  const season = shirt ? (shirt.approx ? shirtSeason(shirt) : shirt.season) : null
  const ground = phase === 'upcoming' ? 'bg-sign' : phase === 'live' || phase === 'closing' ? 'bg-red' : 'bg-ink'
  // the second plate, 3px out (rule 8): navy under the paper figures on a red ground, red on any other
  const shifted = phase === 'live' || phase === 'closing' ? 'text-sign' : 'text-red'
  return (
    <header className={`relative overflow-hidden border-plate border-ink text-paper ${ground}`} data-poster-head="">
      <div aria-hidden="true" className="screen-dots pointer-events-none absolute inset-0" />
      <div className="relative flex flex-col gap-5 p-4 md:flex-row md:items-end md:justify-between md:p-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-body text-[12px] font-extrabold tracking-wide text-paper">{t('auction.kicker')}</p>
            <PhaseStamp phase={phase} />
          </div>
          {season ? (
            <p className="relative mt-2 font-poster text-[84px] leading-[0.85] md:text-[124px]" aria-label={season}>
              <span aria-hidden="true" className={`plate-shift absolute inset-0 ${shifted}`}>
                {shirt?.approx ? season : <Num>{season}</Num>}
              </span>
              <span aria-hidden="true" className="plate-top relative text-paper">
                {shirt?.approx ? season : <Num>{season}</Num>}
              </span>
            </p>
          ) : null}
          <h2 className="mt-2 max-w-[22ch] font-display text-step-4 leading-[1.05] text-paper">
            <bdi>{lot.title}</bdi>
          </h2>
          {shirt ? <p className="mt-1 font-body text-step--1 font-bold text-paper">{shirt.variantHe}</p> : null}
        </div>
        <div className="shrink-0">
          {phase === 'upcoming' && remaining !== null ? (
            <>
              <p className="mb-2 font-sign text-step-1 font-bold text-paper">{startsInLabel(remaining)}</p>
              <Countdown ms={remaining} label={t('auction.clock.toStart')} labelTone="paper" />
              {lot.startsAt ? <p className="mt-2 font-body text-step--1 text-paper">{whenText(lot.startsAt)}</p> : null}
            </>
          ) : phase === 'live' && remaining !== null ? (
            <>
              <Countdown ms={remaining} label={endsInLabel(remaining)} labelTone="paper" />
              {inSnipeWindow(lot, lot.antiSnipeSeconds, now) ? (
                <p className="mt-2 bg-paper px-2 py-1 font-body text-step--1 font-extrabold text-red" data-snipe="">
                  {t('auction.snipe.now')}
                </p>
              ) : null}
            </>
          ) : phase === 'closing' ? (
            <p className="font-sign text-step-2 font-bold text-paper">{t('auction.band.closing')}</p>
          ) : lot.endsAt && (phase === 'awaiting_completion' || phase === 'completed' || phase === 'ended') ? (
            <p className="font-body text-step--1 text-paper">{t('auction.closedAt', { when: whenText(lot.endsAt) })}</p>
          ) : null}
        </div>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------- photos
function Gallery({ photos, shirt }: { photos: string[]; shirt: AuctionShirt | undefined }) {
  const [shown, setShown] = useState(0)
  const main = photos[Math.min(shown, photos.length - 1)] ?? null
  return (
    <div data-gallery="">
      <div className="border-plate border-ink bg-sheet">
        <ShirtPicture photo={main} shirt={shirt} />
      </div>
      {photos.length > 1 ? (
        <ul className="mt-2 grid grid-cols-4 gap-2">
          {photos.map((path, index) => (
            <li key={path}>
              <button
                type="button"
                onClick={() => setShown(index)}
                aria-pressed={index === shown}
                aria-label={t('auction.photo.n', { n: String(index + 1), of: String(photos.length) })}
                className={`block min-h-tap w-full border-rule ${index === shown ? 'border-red' : 'border-ink/40'}`}
              >
                <ShirtPicture photo={path} shirt={shirt} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function ArchiveLinks({ shirt, slug }: { shirt: AuctionShirt | undefined; slug: string }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      <Link href="/kits/archive" prefetch={false} className="inline-flex min-h-tap items-center font-body text-step--1 font-bold text-sign underline underline-offset-4">
        {shirt ? t('auction.archive.link', { season: shirtSeason(shirt), variant: shirt.variantHe }) : t('auction.archive.linkPlain')}
      </Link>
      <Link
        href={`/kits/market?slug=${encodeURIComponent(slug)}`}
        prefetch={false}
        className="inline-flex min-h-tap items-center font-body text-step--1 font-bold text-sign underline underline-offset-4"
      >
        {t('auction.archive.market')}
      </Link>
    </div>
  )
}

// ---------------------------------------------------------------- the price
function PriceBoard({ state, phase }: { state: LotState; phase: LotPhase }) {
  const { lot } = state
  const sold = phase === 'awaiting_completion' || phase === 'completed'
  const label = sold ? t('auction.price.sold') : lot.bidCount === 0 ? t('auction.price.start') : t('auction.price.now')
  const amount = sold && lot.winningAmount !== null ? lot.winningAmount : lot.currentPrice
  const outbid = !lot.leading && lot.yourMax !== null && (phase === 'live' || phase === 'closing')
  return (
    <section aria-label={t('auction.price.board')} className="border-plate border-ink bg-sheet" data-price-board="">
      <div className="flex items-end justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="font-body text-step--1 font-extrabold text-muted">{label}</p>
          <p className="font-poster text-[60px] leading-none text-red md:text-[72px]">
            <Num>{formatPrice(amount, lot.currency)}</Num>
          </p>
        </div>
        {phase === 'upcoming' || phase === 'pending' ? null : (
          <div className="text-end">
            <p className="font-poster text-[40px] leading-none text-ink">
              <Num>{String(lot.bidCount)}</Num>
            </p>
            <p className="font-body text-step--1 font-bold text-muted">{lot.bidCount === 1 ? t('auction.bids.oneWord') : t('auction.bids.word')}</p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t-hair border-ink/40 px-4 py-2">
        <ReserveLine reserveSet={lot.reserveSet} reserveMet={lot.reserveMet} />
        {lot.watchers > 0 ? (
          <p className="font-body text-step--1 text-muted">{t('auction.watchers', { n: String(lot.watchers) })}</p>
        ) : null}
      </div>
      {lot.leading && (phase === 'live' || phase === 'closing') ? (
        <p className="bg-sign px-4 py-2 font-body text-step--1 font-extrabold text-paper" data-standing="leading">
          {lot.yourMax !== null
            ? t('auction.standing.leadingMax', { max: formatPrice(lot.yourMax, lot.currency) })
            : t('auction.standing.leading')}
        </p>
      ) : outbid ? (
        <p className="bg-red px-4 py-2 font-body text-step--1 font-extrabold text-paper" data-standing="outbid">
          {t('auction.standing.outbid', { max: formatPrice(lot.yourMax as number, lot.currency) })}
        </p>
      ) : null}
    </section>
  )
}

// ---------------------------------------------------------------- the bid (spec §34–§36)
function BidForm({ state, now, onBid }: { state: LotState; now: number; onBid: LotActions['bid'] }) {
  const { lot } = state
  const [raw, setRaw] = useState('')
  const [confirming, setConfirming] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const check = checkBid(raw, lot)
  const hint =
    lot.leading && lot.yourMax !== null
      ? t('auction.bid.hintRaise', { max: formatPrice(lot.yourMax, lot.currency) })
      : t('auction.bid.hintMin', { min: formatPrice(lot.minNext, lot.currency) })
  const problem = (result: BidCheck) =>
    result.ok
      ? null
      : result.reason === 'too_low'
        ? t('auction.error.too_low', { min: formatPrice(lot.minNext, lot.currency) })
        : result.reason === 'not_above_max'
          ? t('auction.error.raise', { max: formatPrice(lot.yourMax ?? 0, lot.currency) })
          : result.reason === 'too_high'
            ? t('auction.error.too_high')
            : t('auction.error.bad_amount')
  const submit = async (amount: number) => {
    setBusy(true)
    setError(null)
    const fail = await onBid(amount)
    setBusy(false)
    setConfirming(null)
    if (fail) setError(auctionErrorLabel(fail, lot.currency))
    else setRaw('')
  }
  return (
    <form
      data-bid-form=""
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        const result = checkBid(raw, lot)
        if (!result.ok) {
          setError(problem(result))
          return
        }
        setError(null)
        setConfirming(result.amount)
      }}
      className="border-plate border-red bg-sheet p-4"
    >
      <label htmlFor="max-bid" className="font-display text-step-2 leading-tight text-ink">
        {t('auction.bid.label')}
      </label>
      <p className="mt-1 font-body text-step--1 leading-relaxed text-ink">{t('auction.bid.explain')}</p>
      <div className="mt-3 flex items-stretch border-rule border-ink bg-paper">
        <span className="flex items-center border-e-rule border-ink px-3 font-poster text-[28px] leading-none text-ink" aria-hidden="true">
          {lot.currency === 'ILS' ? '₪' : lot.currency === 'EUR' ? '€' : '$'}
        </span>
        <input
          id="max-bid"
          inputMode="decimal"
          autoComplete="off"
          dir="ltr"
          value={raw}
          onChange={(event) => {
            setRaw(event.target.value)
            setConfirming(null)
            setError(null)
          }}
          placeholder={String(quickBids(lot)[0])}
          aria-describedby="max-bid-hint"
          className="min-h-tap w-full min-w-0 bg-transparent px-3 font-poster text-[32px] leading-none text-ink placeholder:text-muted/60"
        />
      </div>
      <p id="max-bid-hint" className="mt-1.5 font-body text-step--1 font-bold text-muted">
        {hint}
      </p>
      <div className="mt-3 flex flex-wrap gap-2" aria-label={t('auction.bid.quick')}>
        {quickBids(lot).map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => {
              setRaw(String(amount))
              setConfirming(null)
              setError(null)
            }}
            className="min-h-tap border-rule border-ink bg-paper px-3 font-poster text-[22px] leading-none text-ink"
          >
            <Num>{formatPrice(amount, lot.currency)}</Num>
          </button>
        ))}
      </div>
      {confirming === null ? (
        <button
          type="submit"
          disabled={busy}
          className="mt-4 min-h-tap w-full border-rule border-ink bg-red px-4 font-sign text-step-1 font-bold text-paper disabled:opacity-50"
        >
          {check.ok ? t('auction.bid.submitAmount', { amount: formatPrice(check.amount, lot.currency) }) : t('auction.bid.submit')}
        </button>
      ) : (
        <div className="mt-4 border-rule border-ink bg-paper p-3" data-confirm="">
          <p className="font-body text-step-0 font-extrabold text-ink">
            {t('auction.bid.confirm', { amount: formatPrice(confirming, lot.currency) })}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit(confirming)}
              className="min-h-tap border-rule border-ink bg-red px-4 font-body text-step--1 font-extrabold text-paper disabled:opacity-50"
            >
              {busy ? t('auction.bid.sending') : t('auction.bid.yes')}
            </button>
            <button type="button" onClick={() => setConfirming(null)} className="min-h-tap px-3 font-body text-step--1 text-sign underline underline-offset-4">
              {t('auction.bid.no')}
            </button>
          </div>
        </div>
      )}
      {error ? (
        <p role="alert" className="mt-3 font-body text-step--1 font-extrabold text-red">
          {error}
        </p>
      ) : null}
      <p className="mt-4 border-t-hair border-ink/40 pt-3 font-body text-step--1 leading-relaxed text-ink" data-snipe-rule="">
        {t('auction.snipe.rule', { window: snipeWindowText(lot.antiSnipeSeconds) })}
        {inSnipeWindow(lot, lot.antiSnipeSeconds, now) ? <strong className="ms-1 text-red">{t('auction.snipe.now')}</strong> : null}
      </p>
    </form>
  )
}

// ---------------------------------------------------------------- follow and remind (spec §33)
function Follow({
  state,
  signedIn,
  panels,
  actions,
}: {
  state: LotState
  signedIn: boolean
  panels: { watch: boolean; remind: boolean }
  actions: LotActions
}) {
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const watching = state.lot.watching
  return (
    <section aria-label={t('auction.follow.label')} className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {panels.watch ? (
          <button
            type="button"
            aria-pressed={watching}
            disabled={busy}
            onClick={async () => {
              if (!signedIn) {
                setAsking(true)
                return
              }
              setBusy(true)
              const fail = await actions.watch(!watching)
              setBusy(false)
              if (fail?.error === 'auth_required') setAsking(true)
              else setError(fail ? auctionErrorLabel(fail) : null)
            }}
            className={`min-h-tap border-rule border-ink px-5 font-sign text-step-1 font-bold ${watching ? 'bg-ink text-paper' : 'bg-sheet text-ink'}`}
          >
            {watching ? t('auction.follow.on') : t('auction.follow.off')}
          </button>
        ) : null}
        {panels.remind ? (
          <button type="button" onClick={actions.remind} className="min-h-tap border-rule border-ink bg-sheet px-5 font-sign text-step-1 font-bold text-ink">
            {t('auction.remind')}
          </button>
        ) : null}
      </div>
      {panels.remind ? <p className="font-body text-step--1 text-muted">{t('auction.remind.note')}</p> : null}
      {error ? (
        <p role="alert" className="font-body text-step--1 font-extrabold text-red">
          {error}
        </p>
      ) : null}
      {asking ? <SignInPrompt onClose={() => setAsking(false)} /> : null}
    </section>
  )
}

// ---------------------------------------------------------------- the seller's own view
function SellerPanel({
  state,
  phase,
  withdraw,
  onWithdraw,
}: {
  state: LotState
  phase: LotPhase
  withdraw: boolean
  onWithdraw: LotActions['withdraw']
}) {
  const { lot } = state
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <section className="border-plate border-sign bg-sign p-4 text-paper" data-seller-panel="">
      <p className="font-display text-step-2 leading-tight">{t('auction.seller.title')}</p>
      <p className="mt-1 font-body text-step--1 leading-relaxed">{t('auction.seller.noBid')}</p>
      <p className="mt-3 font-body text-step-0 font-extrabold">
        {lot.reservePrice !== null ? (
          <>
            {t('auction.seller.reserve')} <Num>{formatPrice(lot.reservePrice, lot.currency)}</Num>
          </>
        ) : (
          t('auction.seller.noReserve')
        )}
      </p>
      {lot.reservePrice !== null ? <p className="font-body text-step--1">{t('auction.seller.reserveOnly')}</p> : null}
      {phase === 'pending' ? <p className="mt-3 font-body text-step--1 font-bold">{t('auction.seller.pending')}</p> : null}
      {phase === 'rejected' ? (
        <p className="mt-3 font-body text-step--1 font-bold">
          {t('auction.seller.rejected')}
          {lot.decisionNote ? (
            <>
              {' '}
              <bdi>{lot.decisionNote}</bdi>
            </>
          ) : null}
        </p>
      ) : null}
      {phase === 'cancelled' && lot.decisionNote ? (
        <p className="mt-3 font-body text-step--1">
          <bdi>{lot.decisionNote}</bdi>
        </p>
      ) : null}
      {phase === 'ended' && lot.bidCount > 0 && lot.reserveSet && !lot.reserveMet ? (
        <p className="mt-3 font-body text-step--1 font-bold">{t('auction.seller.reserveMissed')}</p>
      ) : null}
      {withdraw ? (
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="mt-3 min-h-tap border-rule border-paper px-4 font-body text-step--1 font-extrabold text-paper"
        >
          {t('auction.seller.withdraw')}
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 bg-paper px-2 py-1 font-body text-step--1 font-extrabold text-red">
          {error}
        </p>
      ) : null}
      {asking ? (
        <ReasonDialog
          title={t('auction.seller.withdrawTitle')}
          body={t('auction.seller.withdrawBody')}
          confirm={t('auction.seller.withdraw')}
          reason="none"
          onClose={() => setAsking(false)}
          onConfirm={async () => {
            const fail = await onWithdraw()
            setAsking(false)
            setError(fail ? auctionErrorLabel(fail) : null)
          }}
        />
      ) : null}
    </section>
  )
}

// ---------------------------------------------------------------- after the whistle (spec §39, §59)
function Aftermath({
  state,
  phase,
  canComplete,
  donation,
  onComplete,
}: {
  state: LotState
  phase: LotPhase
  canComplete: boolean
  donation: boolean
  onComplete: LotActions['complete']
}) {
  const { lot } = state
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const party = lot.isSeller || lot.won
  if (phase === 'awaiting_completion') {
    const mineDone = lot.isSeller ? lot.sellerDone : lot.winnerDone
    return (
      <section className="border-plate border-ink bg-ink p-4 text-paper" data-aftermath="awaiting">
        <p className="font-display text-step-3 leading-tight">
          {lot.won ? t('auction.after.won') : lot.isSeller ? t('auction.after.sold') : t('auction.after.closed')}
        </p>
        {party && lot.winningAmount !== null ? (
          <p className="mt-1 font-poster text-[44px] leading-none text-paper">
            <Num>{formatPrice(lot.winningAmount, lot.currency)}</Num>
          </p>
        ) : null}
        <p className="mt-2 font-body text-step--1 leading-relaxed">
          {party ? t('auction.after.partyBody') : t('auction.after.publicBody')}
        </p>
        {party ? (
          <p className="mt-2 font-body text-step--1 font-bold">
            {mineDone ? (lot.isSeller ? t('auction.after.waitWinner') : t('auction.after.waitSeller')) : t('auction.after.markHint')}
          </p>
        ) : null}
        {party && lot.connectionId ? (
          <a
            href={`/kits/market/c/${lot.connectionId}`}
            data-lot-thread=""
            className="mt-3 inline-flex min-h-tap items-center border-rule border-paper px-4 font-body text-step--1 font-extrabold text-paper underline-offset-4 hover:underline"
          >
            {lot.isSeller ? t('auction.after.threadSeller') : t('auction.after.threadWinner')}
          </a>
        ) : null}
        {canComplete ? (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              const fail = await onComplete()
              setBusy(false)
              setError(fail ? auctionErrorLabel(fail) : null)
            }}
            className="mt-3 min-h-tap border-rule border-paper bg-red px-4 font-sign text-step-1 font-bold text-paper disabled:opacity-50"
          >
            {t('auction.after.complete')}
          </button>
        ) : null}
        {error ? (
          <p role="alert" className="mt-2 bg-paper px-2 py-1 font-body text-step--1 font-extrabold text-red">
            {error}
          </p>
        ) : null}
      </section>
    )
  }
  if (phase === 'completed') {
    return (
      <div className="flex flex-col gap-4" data-aftermath="completed">
        <section className="border-plate border-ink bg-sheet p-4">
          <p className="font-display text-step-3 leading-tight text-ink">{party ? t('auction.done.title') : t('auction.done.public')}</p>
          {party ? <p className="mt-2 font-body text-step--1 leading-relaxed text-ink">{t('auction.done.body')}</p> : null}
        </section>
        {donation ? <DonationCard dealKey={lot.id} /> : null}
      </div>
    )
  }
  if (phase === 'ended' && !lot.isSeller) {
    return <p className="font-sign text-step-1 text-muted" data-aftermath="ended">{t('auction.after.noWinner')}</p>
  }
  if (phase === 'cancelled' && !lot.isSeller) {
    return <p className="font-sign text-step-1 text-muted" data-aftermath="cancelled">{t('auction.after.cancelled')}</p>
  }
  return null
}

// ---------------------------------------------------------------- the bids, anonymous (spec §19)
function BidHistory({ bids, now, currency }: { bids: LotState['bids']; now: number; currency: LotState['lot']['currency'] }) {
  return (
    <section aria-labelledby="lot-bids">
      <h3 id="lot-bids" className="border-b-rule border-ink pb-1 font-display text-step-2 leading-tight text-ink">
        {t('auction.history.title')}
      </h3>
      {bids.length === 0 ? (
        <p className="mt-2 font-body text-step--1 text-muted">{t('auction.history.empty')}</p>
      ) : (
        <ol className="mt-1" data-bid-history="">
          {bids.map((bid, index) => (
            <li
              key={`${bid.at}-${bid.bidder}-${index}`}
              className={`flex items-baseline justify-between gap-3 border-b-hair border-ink/30 py-2 ${bid.you ? 'border-s-4 border-s-red bg-sheet ps-2' : ''} ${index === 0 ? 'font-extrabold' : ''}`}
            >
              <span className="min-w-0 font-body text-step--1 text-ink">
                <bdi className={bid.you ? 'font-extrabold text-red' : ''}>{bidderLabel(bid)}</bdi>
                {bid.proxy ? <span className="ms-2 text-[11.5px] font-normal text-muted">{t('auction.history.proxy')}</span> : null}
              </span>
              <span className="flex shrink-0 items-baseline gap-3">
                <span className="font-poster text-[22px] leading-none text-ink">
                  <Num>{formatPrice(bid.amount, currency)}</Num>
                </span>
                <span className="font-mono text-[12px] tabular-nums text-muted">
                  <Num>{bidTimeText(bid.at, now)}</Num>
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-2 font-body text-[11.5px] leading-snug text-muted">{t('auction.history.note')}</p>
    </section>
  )
}
