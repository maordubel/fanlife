'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { useAuctionApi } from '@/components/auction/AuctionApi'
import { ShirtPicture } from '@/components/auction/ShirtPicture'
import { ItemFacts } from '@/components/collector/ItemFacts'
import { SignInPrompt } from '@/components/collector/SignInPrompt'
import { EmptyState } from '@/components/ui/EmptyState'
import { Num } from '@/components/ui/Num'
import {
  checklistFor,
  checkSubmission,
  HOUR_CHOICES,
  shirtSeason,
  type AuctionShirt,
  type ChecklistKey,
  type SubmitDraft,
  type SubmitProblem,
} from '@/lib/collector/auction'
import { errorLabel, formatPrice } from '@/lib/collector/labels'
import { CURRENCIES, type CollectorError, type Currency, type OwnerItem } from '@/lib/collector/types'
import { t, type MessageKey } from '@/lib/i18n'

type Page =
  | { status: 'loading' }
  | { status: 'failed'; error: CollectorError }
  | { status: 'missing' }
  | { status: 'ready'; item: OwnerItem }
  | { status: 'sent'; lotId: string }

const CHECK: Record<ChecklistKey, MessageKey> = {
  front: 'auction.submit.check.front',
  back: 'auction.submit.check.back',
  labels: 'auction.submit.check.labels',
  logos: 'auction.submit.check.logos',
  print: 'auction.submit.check.print',
  defects: 'auction.submit.check.defects',
  size: 'auction.submit.check.size',
  condition: 'auction.submit.check.condition',
  origin: 'auction.submit.check.origin',
  history: 'auction.submit.check.history',
  proof: 'auction.submit.check.proof',
}
/** rows the item itself answers — photos, size and condition come from the closet, not from a tick */
const AUTO: readonly ChecklistKey[] = ['front', 'back', 'size', 'condition']

const PROBLEM: Record<SubmitProblem, MessageKey> = {
  checklist: 'auction.submit.problem.checklist',
  title: 'auction.submit.problem.title',
  description: 'auction.submit.problem.description',
  start: 'auction.submit.problem.start',
  reserve: 'auction.submit.problem.reserve',
  hours: 'auction.submit.problem.hours',
  increment: 'auction.submit.problem.increment',
}

const OPEN_LOT = ['pending_approval', 'scheduled', 'awaiting_completion']

export function SubmitLot({ itemId, shirts }: { itemId: string; shirts: Record<string, AuctionShirt> }) {
  const api = useAuctionApi()
  const [page, setPage] = useState<Page>({ status: 'loading' })

  useEffect(() => {
    let live = true
    void api.closetMine().then((closet) => {
      if (!live) return
      if (!closet.ok) {
        setPage({ status: 'failed', error: closet.error })
        return
      }
      const item = closet.items.find((row) => row.id === itemId)
      setPage(item ? { status: 'ready', item } : { status: 'missing' })
    })
    return () => {
      live = false
    }
  }, [api, itemId])

  if (page.status === 'loading') return <p className="mt-stack font-sign text-step-1 text-muted">{t('auction.loading')}</p>
  if (page.status === 'failed') {
    if (page.error === 'auth_required') return <div className="mt-stack"><SignInPrompt /></div>
    if (page.error === 'off') return <EmptyState title={t('auction.off.title')} body={t('auction.off.body')} />
    return <EmptyState title={t('auction.failed.title')} body={errorLabel(page.error)} tone="red" />
  }
  if (page.status === 'missing') {
    return (
      <div className="mt-stack">
        <EmptyState title={t('auction.submit.missing.title')} body={t('auction.submit.missing.body')} />
        <BackToCloset />
      </div>
    )
  }
  if (page.status === 'sent') {
    return (
      <section className="mt-stack border-plate border-ink bg-sheet p-5" data-submit="sent" role="status">
        <p className="font-display text-step-4 leading-tight text-ink">{t('auction.submit.sent.title')}</p>
        <p className="mt-2 max-w-prose font-body text-step-0 leading-relaxed text-ink">{t('auction.submit.sent.body')}</p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
          <Link href={`/kits/auction/${page.lotId}`} prefetch={false} className="inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-sign underline underline-offset-4">
            {t('auction.submit.sent.lot')}
          </Link>
          <BackToCloset />
        </div>
      </section>
    )
  }
  const item = page.item
  if (item.lot && OPEN_LOT.includes(item.lot.status)) {
    return (
      <div className="mt-stack">
        <EmptyState title={t('auction.submit.already.title')} body={t('auction.submit.already.body')} />
        <Link href={`/kits/auction/${item.lot.id}`} prefetch={false} className="mt-3 inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-sign underline underline-offset-4">
          {t('auction.submit.sent.lot')}
        </Link>
      </div>
    )
  }
  return <SubmitForm item={item} shirt={shirts[item.archiveSlug]} onSent={(lotId) => setPage({ status: 'sent', lotId })} />
}

function BackToCloset() {
  return (
    <Link href="/kits/closet" prefetch={false} className="inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-sign underline underline-offset-4">
      {t('auction.submit.backToCloset')}
    </Link>
  )
}

function SubmitForm({ item, shirt, onSent }: { item: OwnerItem; shirt: AuctionShirt | undefined; onSent: (lotId: string) => void }) {
  const api = useAuctionApi()
  const matchWorn = item.authenticityClaim === 'match_worn'
  const rows = checklistFor(matchWorn)
  const defaultTitle = shirt ? t('auction.submit.defaultTitle', { variant: shirt.variantHe, season: shirtSeason(shirt) }) : ''
  const [draft, setDraft] = useState<SubmitDraft>({
    title: defaultTitle,
    description: item.description ?? '',
    startPrice: '',
    reservePrice: '',
    currency: item.currency,
    hours: 72,
    increment: '',
    checked: {},
  })
  const [problems, setProblems] = useState<SubmitProblem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const auto = useMemo<Partial<Record<ChecklistKey, boolean>>>(
    () => ({ front: item.photos.length >= 1, back: item.photos.length >= 2, size: item.size !== null, condition: item.condition !== null }),
    [item],
  )
  const checked = { ...draft.checked, ...auto }
  const set = <K extends keyof SubmitDraft>(key: K, value: SubmitDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const has = (problem: SubmitProblem) => problems.includes(problem)
  const typeUnknown = item.itemType === 'unknown'

  const submit = async () => {
    const result = checkSubmission({ ...draft, checked }, matchWorn)
    if (!result.ok) {
      setProblems(result.problems)
      setError(t('auction.submit.fix'))
      return
    }
    setProblems([])
    setError(null)
    setBusy(true)
    const sent = await api.auctionSubmit({
      itemId: item.id,
      title: result.value.title,
      description: result.value.description,
      startPrice: result.value.startPrice,
      reservePrice: result.value.reservePrice,
      currency: result.value.currency,
      hours: result.value.hours,
      increment: result.value.increment,
    })
    setBusy(false)
    if (sent.ok) onSent(sent.lotId)
    else setError(errorLabel(sent.error))
  }

  const field = 'mt-1 block w-full border-rule border-ink bg-paper px-3 font-body text-step-0 text-ink'
  return (
    <form
      noValidate
      data-submit="form"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
      className="mt-stack grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-start lg:gap-8"
    >
      <aside className="flex flex-col gap-3 md:sticky md:top-4">
        <div className="border-plate border-ink bg-sheet">
          <ShirtPicture photo={item.photos[0] ?? null} shirt={shirt} />
        </div>
        {shirt ? (
          <p className="font-poster text-[32px] leading-none text-ink">
            {shirt.approx ? shirtSeason(shirt) : <Num>{shirt.season}</Num>} <span className="font-body text-step--1 font-bold">{shirt.variantHe}</span>
          </p>
        ) : null}
        <ItemFacts item={item} showPrice={false} />
        <p className="font-body text-step--1 text-muted">{t('auction.submit.photos', { n: String(item.photos.length) })}</p>
      </aside>

      <div className="flex flex-col gap-6">
        <p className="max-w-prose font-body text-step-0 leading-relaxed text-ink">{t('auction.submit.lede')}</p>

        <fieldset className={`border-plate p-4 ${has('checklist') ? 'border-red' : 'border-ink'}`}>
          <legend className="px-1 font-display text-step-2 text-ink">{t('auction.submit.checklist')}</legend>
          <p className="font-body text-step--1 leading-relaxed text-muted">{t('auction.submit.checklistNote')}</p>
          <ul className="mt-2 flex flex-col">
            {rows.map((key) => {
              const isAuto = AUTO.includes(key)
              const on = Boolean(checked[key])
              return (
                <li key={key} className="border-b-hair border-ink/30 last:border-b-0">
                  {isAuto ? (
                    <p className="flex min-h-tap items-center gap-3 font-body text-step--1 text-ink" data-auto={on ? 'yes' : 'no'}>
                      <span aria-hidden="true" className={`inline-flex h-6 w-6 shrink-0 items-center justify-center border-rule font-bold ${on ? 'border-sign bg-sign text-paper' : 'border-red text-red'}`}>
                        {on ? '✓' : '!'}
                      </span>
                      <span>
                        {t(CHECK[key])}
                        {on ? null : <span className="ms-1 font-bold text-red">{t('auction.submit.fromCloset')}</span>}
                      </span>
                    </p>
                  ) : (
                    <label className="flex min-h-tap cursor-pointer items-center gap-3 font-body text-step--1 text-ink">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(event) => set('checked', { ...draft.checked, [key]: event.target.checked })}
                        className="h-6 w-6 shrink-0 accent-sign"
                      />
                      <span>{t(CHECK[key])}</span>
                    </label>
                  )}
                </li>
              )
            })}
          </ul>
          {typeUnknown ? <p className="mt-2 font-body text-step--1 font-bold text-red">{t('auction.submit.typeUnknown')}</p> : null}
          {auto.front && auto.back && auto.size && auto.condition ? null : <div className="mt-2"><BackToCloset /></div>}
        </fieldset>

        <fieldset className="flex flex-col gap-4 border-plate border-ink p-4">
          <legend className="px-1 font-display text-step-2 text-ink">{t('auction.submit.lot')}</legend>
          <label className="font-body text-step--1 font-extrabold text-ink">
            {t('auction.submit.title')}
            <input value={draft.title} maxLength={120} onChange={(event) => set('title', event.target.value)} className={`${field} min-h-tap ${has('title') ? 'border-red' : ''}`} />
            {has('title') ? <span className="mt-1 block font-bold text-red">{t(PROBLEM.title)}</span> : null}
          </label>
          <label className="font-body text-step--1 font-extrabold text-ink">
            {t('auction.submit.description')}
            <span className="block font-normal text-muted">{t('auction.submit.descriptionHint')}</span>
            <textarea
              value={draft.description}
              maxLength={3000}
              rows={6}
              onChange={(event) => set('description', event.target.value)}
              className={`${field} py-2 ${has('description') ? 'border-red' : ''}`}
            />
            <span className="mt-1 block font-normal text-muted">
              <Num>{String(draft.description.trim().length)}</Num> / <Num>3000</Num>
            </span>
            {has('description') ? <span className="mt-1 block font-bold text-red">{t(PROBLEM.description)}</span> : null}
          </label>
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-4 border-plate border-ink p-4 sm:grid-cols-2">
          <legend className="px-1 font-display text-step-2 text-ink">{t('auction.submit.money')}</legend>
          <label className="font-body text-step--1 font-extrabold text-ink">
            {t('auction.submit.start')}
            <input inputMode="decimal" dir="ltr" value={draft.startPrice} onChange={(event) => set('startPrice', event.target.value)} className={`${field} min-h-tap ${has('start') ? 'border-red' : ''}`} />
            {has('start') ? <span className="mt-1 block font-bold text-red">{t(PROBLEM.start)}</span> : null}
          </label>
          <label className="font-body text-step--1 font-extrabold text-ink">
            {t('auction.submit.reserve')}
            <input inputMode="decimal" dir="ltr" value={draft.reservePrice} onChange={(event) => set('reservePrice', event.target.value)} className={`${field} min-h-tap ${has('reserve') ? 'border-red' : ''}`} />
            <span className="mt-1 block font-normal text-muted">{t('auction.submit.reserveHint')}</span>
            {has('reserve') ? <span className="mt-1 block font-bold text-red">{t(PROBLEM.reserve)}</span> : null}
          </label>
          <label className="font-body text-step--1 font-extrabold text-ink">
            {t('auction.submit.currency')}
            <select value={draft.currency} onChange={(event) => set('currency', event.target.value as Currency)} className={`${field} min-h-tap`}>
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
          <label className="font-body text-step--1 font-extrabold text-ink">
            {t('auction.submit.hours')}
            <select value={draft.hours} onChange={(event) => set('hours', Number(event.target.value))} className={`${field} min-h-tap ${has('hours') ? 'border-red' : ''}`}>
              {HOUR_CHOICES.map((hours) => (
                <option key={hours} value={hours}>
                  {hours % 24 === 0 ? t('auction.submit.days', { n: String(hours / 24) }) : t('auction.submit.hoursN', { n: String(hours) })}
                </option>
              ))}
            </select>
          </label>
          <label className="font-body text-step--1 font-extrabold text-ink sm:col-span-2">
            {t('auction.submit.increment')}
            <input inputMode="decimal" dir="ltr" value={draft.increment} onChange={(event) => set('increment', event.target.value)} className={`${field} min-h-tap ${has('increment') ? 'border-red' : ''}`} />
            <span className="mt-1 block font-normal text-muted">{t('auction.submit.incrementHint')}</span>
            {has('increment') ? <span className="mt-1 block font-bold text-red">{t(PROBLEM.increment)}</span> : null}
          </label>
        </fieldset>

        <p className="border-s-4 border-sign ps-3 font-body text-step--1 leading-relaxed text-ink">{t('auction.submit.noFee')}</p>

        {error ? (
          <p role="alert" className="font-body text-step--1 font-extrabold text-red">
            {error}
          </p>
        ) : null}
        {has('checklist') ? <p className="font-body text-step--1 font-bold text-red">{t(PROBLEM.checklist)}</p> : null}

        <button type="submit" disabled={busy} className="min-h-tap w-full border-rule border-ink bg-red px-4 font-sign text-step-1 font-bold text-paper disabled:opacity-50 sm:w-auto sm:self-start sm:px-8">
          {busy ? t('auction.submit.sending') : t('auction.submit.send')}
        </button>
        {draft.startPrice && !has('start') ? (
          <p className="font-body text-step--1 text-muted">
            {t('auction.submit.preview')} <Num>{formatPrice(Number(draft.startPrice.replace(/[^\d.]/g, '')) || 0, draft.currency)}</Num>
          </p>
        ) : null}
      </div>
    </form>
  )
}
