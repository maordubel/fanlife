'use client'

import { useCallback, useEffect, useState } from 'react'

import { useAuctionApi } from '@/components/auction/AuctionApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { Num } from '@/components/ui/Num'
import {
  auctionErrorLabel,
  checkMerchant,
  EMPTY_MERCHANT,
  merchantDraftOf,
  type MerchantDraft,
  type MerchantProblem,
  type MerchantRow,
  type UrlProblem,
} from '@/lib/collector/auction'
import { formatPrice } from '@/lib/collector/labels'
import { CURRENCIES, type CollectorError, type Currency } from '@/lib/collector/types'
import { t, type MessageKey } from '@/lib/i18n'

const OFFER: Record<MerchantRow['offer_type'], MessageKey> = {
  official: 'admin.shop.offer.official',
  official_reissue: 'admin.shop.offer.official_reissue',
  replica: 'admin.shop.offer.replica',
  external_new: 'admin.shop.offer.external_new',
}
const MERCHANT: Record<MerchantRow['merchant_type'], MessageKey> = {
  club_store: 'admin.shop.type.club_store',
  retro_store: 'admin.shop.type.retro_store',
  other: 'admin.shop.type.other',
}
const AVAILABILITY: Record<MerchantRow['availability'], MessageKey> = {
  in_stock: 'admin.shop.availability.in_stock',
  out_of_stock: 'admin.shop.availability.out_of_stock',
  unknown: 'admin.shop.availability.unknown',
}
const PROBLEM: Record<MerchantProblem, MessageKey> = {
  target: 'admin.shop.problem.target',
  slug: 'admin.shop.problem.slug',
  kit: 'admin.shop.problem.kit',
  season: 'admin.shop.problem.season',
  name: 'admin.shop.problem.name',
  url: 'admin.shop.problem.url',
  image: 'admin.shop.problem.image',
  price: 'admin.shop.problem.price',
  official_needs_store: 'admin.shop.problem.official_needs_store',
  replica_not_store: 'admin.shop.problem.replica_not_store',
  date: 'admin.shop.problem.date',
  rank: 'admin.shop.problem.rank',
}
const URL_PROBLEM: Record<UrlProblem, MessageKey> = {
  empty: 'admin.shop.url.empty',
  not_https: 'admin.shop.url.not_https',
  has_query: 'admin.shop.url.has_query',
  has_fragment: 'admin.shop.url.has_fragment',
  bad: 'admin.shop.url.bad',
}

/** A percent-encoded Hebrew slug, shown as it reads. */
function readable(url: string): string {
  try {
    return decodeURI(url)
  } catch {
    return url
  }
}

/**
 * חנויות (מפרט §22–§27): הקישורים שהארכיון מציג ליד חולצה. רשמי רק מחנות המועדון, רפליקה
 * לעולם לא בתחפושת של החנות, ואף כתובת לא נושאת פרמטר — הטופס אומר את זה לפני המסד,
 * והמסד בודק שוב בטבלה עצמה. כל שינוי נרשם ביומן בטריגר.
 */
export function AdminShops() {
  const api = useAuctionApi()
  const [rows, setRows] = useState<MerchantRow[] | null>(null)
  const [error, setError] = useState<CollectorError | null>(null)
  const [editing, setEditing] = useState<MerchantDraft | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    const result = await api.adminMerchantList()
    if (result.ok) {
      setError(null)
      setRows(result.offers as unknown as MerchantRow[])
    } else setError(result.error)
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  if (error) return <p role="alert" className="font-body text-step--1 font-extrabold text-red">{auctionErrorLabel({ error })}</p>
  if (!rows) return <p className="font-sign text-step-1 text-muted">{t('auction.loading')}</p>
  return (
    <div className="flex flex-col gap-4" data-admin-shops="">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-body text-step--1 text-muted">{t('admin.shop.count', { n: String(rows.length) })}</p>
        <button type="button" onClick={() => setEditing({ ...EMPTY_MERCHANT })} className="min-h-tap border-rule border-ink bg-sign px-4 font-body text-step--1 font-extrabold text-paper">
          {t('admin.shop.add')}
        </button>
      </div>
      {message ? (
        <p role="status" className="border-rule border-sign bg-sheet px-3 py-2 font-body text-step--1 font-extrabold text-sign">
          {message}
        </p>
      ) : null}
      {editing ? (
        <ShopForm
          draft={editing}
          onCancel={() => setEditing(null)}
          onSave={async (payload) => {
            const result = await api.adminMerchantUpsert(payload)
            if (result.ok) {
              setEditing(null)
              setMessage(t('admin.shop.saved'))
              void load()
              return null
            }
            return auctionErrorLabel(result)
          }}
        />
      ) : null}
      {rows.length === 0 ? <EmptyState title={t('admin.shop.empty')} body={t('admin.shop.emptyBody')} /> : null}
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.id} className={`border-rule p-3 ${row.is_active ? 'border-ink bg-sheet' : 'border-ink/40 bg-paper text-muted'}`} data-shop={row.offer_type}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-body text-step--1 font-extrabold">
                  <bdi>{row.merchant_name}</bdi> · {t(OFFER[row.offer_type])}
                  {row.is_official_club_store ? <span className="ms-2 bg-red px-1.5 text-[11px] text-paper">{t('admin.shop.clubStore')}</span> : null}
                  {row.is_active ? null : <span className="ms-2 text-[11px]">{t('admin.shop.inactive')}</span>}
                </p>
                <p className="font-body text-step--1">
                  <bdi>{row.title_he ?? '—'}</bdi>
                </p>
                <p className="font-mono text-[11.5px] tabular-nums text-muted">
                  <bdi dir="ltr">{[row.archive_slug, row.kit_id, row.season_label].filter(Boolean).join(' · ')}</bdi>
                </p>
                <p className="truncate font-mono text-[11.5px] tabular-nums text-sign" dir="ltr">
                  {readable(row.product_url)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {row.price !== null ? (
                  <span className="font-poster text-[22px] leading-none">
                    <Num>{formatPrice(Number(row.price), row.currency)}</Num>
                  </span>
                ) : null}
                <span className="font-body text-[12px]">{t(AVAILABILITY[row.availability])}</span>
                <button type="button" onClick={() => setEditing(merchantDraftOf(row))} className="min-h-tap px-2 font-body text-step--1 font-bold text-sign underline underline-offset-4">
                  {t('admin.shop.edit')}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ShopForm({ draft: initial, onCancel, onSave }: { draft: MerchantDraft; onCancel: () => void; onSave: (payload: Record<string, unknown>) => Promise<string | null> }) {
  const [draft, setDraft] = useState(initial)
  const [shown, setShown] = useState<MerchantProblem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const check = checkMerchant(draft)
  const set = <K extends keyof MerchantDraft>(key: K, value: MerchantDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const bad = (problem: MerchantProblem) => shown.includes(problem)
  const field = 'mt-1 block min-h-tap w-full border-rule bg-paper px-2 font-body text-step-0 font-normal text-ink'
  const tone = (problem: MerchantProblem) => (bad(problem) ? 'border-red' : 'border-ink')
  return (
    <form
      noValidate
      data-shop-form=""
      onSubmit={async (event) => {
        event.preventDefault()
        if (check.problems.length) {
          setShown(check.problems)
          return
        }
        setBusy(true)
        const failed = await onSave(check.payload)
        setBusy(false)
        setError(failed)
      }}
      className="grid grid-cols-1 gap-3 border-plate border-sign bg-sheet p-4 sm:grid-cols-2"
    >
      <p className="font-display text-step-2 text-ink sm:col-span-2">{draft.id ? t('admin.shop.editTitle') : t('admin.shop.addTitle')}</p>
      <label className="font-body text-step--1 font-extrabold text-ink sm:col-span-2">
        {t('admin.shop.field.url')}
        <input dir="ltr" value={draft.productUrl} onChange={(event) => set('productUrl', event.target.value)} className={`${field} ${tone('url')}`} />
        {draft.productUrl && check.url ? <span className="mt-1 block font-bold text-red">{t(URL_PROBLEM[check.url])}</span> : null}
        {!draft.productUrl && bad('url') ? <span className="mt-1 block font-bold text-red">{t(URL_PROBLEM.empty)}</span> : null}
      </label>
      <label className="font-body text-step--1 font-extrabold text-ink">
        {t('admin.shop.field.name')}
        <input value={draft.merchantName} onChange={(event) => set('merchantName', event.target.value)} className={`${field} ${tone('name')}`} />
      </label>
      <label className="font-body text-step--1 font-extrabold text-ink">
        {t('admin.shop.field.title')}
        <input value={draft.title} maxLength={160} onChange={(event) => set('title', event.target.value)} className={`${field} border-ink`} />
      </label>
      <label className="font-body text-step--1 font-extrabold text-ink">
        {t('admin.shop.field.merchantType')}
        <select value={draft.merchantType} onChange={(event) => set('merchantType', event.target.value as MerchantDraft['merchantType'])} className={`${field} border-ink`}>
          {(Object.keys(MERCHANT) as MerchantDraft['merchantType'][]).map((key) => (
            <option key={key} value={key}>
              {t(MERCHANT[key])}
            </option>
          ))}
        </select>
      </label>
      <label className="font-body text-step--1 font-extrabold text-ink">
        {t('admin.shop.field.offerType')}
        <select value={draft.offerType} onChange={(event) => set('offerType', event.target.value as MerchantDraft['offerType'])} className={`${field} ${tone('official_needs_store')}`}>
          {(Object.keys(OFFER) as MerchantDraft['offerType'][]).map((key) => (
            <option key={key} value={key}>
              {t(OFFER[key])}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-h-tap items-center gap-3 font-body text-step--1 font-extrabold text-ink sm:col-span-2">
        <input type="checkbox" checked={draft.isOfficialClubStore} onChange={(event) => set('isOfficialClubStore', event.target.checked)} className="h-6 w-6 accent-sign" />
        {t('admin.shop.field.official')}
      </label>
      {bad('official_needs_store') ? <p className="font-body text-step--1 font-bold text-red sm:col-span-2">{t(PROBLEM.official_needs_store)}</p> : null}
      {bad('replica_not_store') ? <p className="font-body text-step--1 font-bold text-red sm:col-span-2">{t(PROBLEM.replica_not_store)}</p> : null}
      <label className="font-body text-step--1 font-extrabold text-ink">
        {t('admin.shop.field.slug')}
        <input dir="ltr" value={draft.archiveSlug} onChange={(event) => set('archiveSlug', event.target.value)} className={`${field} ${tone('slug')}`} />
      </label>
      <label className="font-body text-step--1 font-extrabold text-ink">
        {t('admin.shop.field.kit')}
        <input dir="ltr" value={draft.kitId} onChange={(event) => set('kitId', event.target.value)} className={`${field} ${tone('kit')}`} />
      </label>
      <label className="font-body text-step--1 font-extrabold text-ink">
        {t('admin.shop.field.season')}
        <input dir="ltr" placeholder="2026/27" value={draft.seasonLabel} onChange={(event) => set('seasonLabel', event.target.value)} className={`${field} ${tone('season')}`} />
      </label>
      <label className="font-body text-step--1 font-extrabold text-ink">
        {t('admin.shop.field.price')}
        <span className="mt-1 flex gap-2">
          <input inputMode="decimal" dir="ltr" value={draft.price} onChange={(event) => set('price', event.target.value)} className={`${field} mt-0 ${tone('price')}`} />
          <select value={draft.currency} onChange={(event) => set('currency', event.target.value as Currency)} className={`${field} mt-0 w-28 shrink-0 border-ink`}>
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </span>
      </label>
      <label className="font-body text-step--1 font-extrabold text-ink">
        {t('admin.shop.field.availability')}
        <select value={draft.availability} onChange={(event) => set('availability', event.target.value as MerchantDraft['availability'])} className={`${field} border-ink`}>
          {(Object.keys(AVAILABILITY) as MerchantDraft['availability'][]).map((key) => (
            <option key={key} value={key}>
              {t(AVAILABILITY[key])}
            </option>
          ))}
        </select>
      </label>
      <label className="font-body text-step--1 font-extrabold text-ink">
        {t('admin.shop.field.checked')}
        <input type="date" dir="ltr" value={draft.lastCheckedAt} onChange={(event) => set('lastCheckedAt', event.target.value)} className={`${field} ${tone('date')}`} />
      </label>
      <label className="font-body text-step--1 font-extrabold text-ink sm:col-span-2">
        {t('admin.shop.field.image')}
        <input dir="ltr" value={draft.imageUrl} onChange={(event) => set('imageUrl', event.target.value)} className={`${field} ${tone('image')}`} />
      </label>
      <label className="font-body text-step--1 font-extrabold text-ink">
        {t('admin.shop.field.rank')}
        <input inputMode="numeric" dir="ltr" value={draft.sortRank} onChange={(event) => set('sortRank', event.target.value)} className={`${field} ${tone('rank')}`} />
      </label>
      <label className="flex min-h-tap items-center gap-3 self-end font-body text-step--1 font-extrabold text-ink">
        <input type="checkbox" checked={draft.isActive} onChange={(event) => set('isActive', event.target.checked)} className="h-6 w-6 accent-sign" />
        {t('admin.shop.field.active')}
      </label>
      {shown.length ? (
        <ul className="list-inside list-disc font-body text-step--1 font-bold text-red sm:col-span-2" role="alert">
          {shown.map((problem) => (
            <li key={problem}>{t(PROBLEM[problem])}</li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p role="alert" className="font-body text-step--1 font-extrabold text-red sm:col-span-2">
          {error}
        </p>
      ) : null}
      <p className="font-body text-[12px] text-muted sm:col-span-2">{t('admin.shop.noAffiliate')}</p>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className="min-h-tap border-rule border-ink bg-red px-4 font-body text-step--1 font-extrabold text-paper disabled:opacity-50">
          {t('admin.shop.save')}
        </button>
        <button type="button" onClick={onCancel} className="min-h-tap px-3 font-body text-step--1 text-sign underline underline-offset-4">
          {t('admin.reason.cancel')}
        </button>
      </div>
    </form>
  )
}
