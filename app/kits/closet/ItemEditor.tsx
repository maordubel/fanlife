'use client'

import { useRef, useState } from 'react'

import { ShirtThumb } from '@/components/collector/ShirtThumb'
import { UserPhoto } from '@/components/collector/UserPhoto'
import { Num } from '@/components/ui/Num'
import { useDialog } from '@/components/ui/useDialog'
import { shirtDateText } from '@/lib/collector/cards'
import { claimAllowed, draftOf, LIMITS, movePhoto, patchFrom, precheck, type Draft, type DraftProblem } from '@/lib/collector/editor'
import { claimLabel, conditionLabel, errorLabel, isReproduction, sizeLabel, typeLabel } from '@/lib/collector/labels'
import {
  CLAIMS,
  CONDITIONS,
  CURRENCIES,
  ITEM_TYPES,
  SIZES,
  type CollectorError,
  type CollectorShirt,
  type OwnerItem,
} from '@/lib/collector/types'
import { t, type MessageKey } from '@/lib/i18n'

import type { ClosetApi } from './api'

/**
 * כרטיס העותק — מה שהאספן מוסיף מעבר ל"יש לי", ורק כשהוא רוצה (מפרט §7).
 *
 * גיליון אחד, מעל הניווט (כלל 33), שמיש ב-360 פיקסלים: ראש קבוע עם הסגירה, גוף שנגלל, ושורת
 * שמירה קבועה בתחתית שלא נעלמת מתחת למקלדת. התמונות עולות מיד כשבוחרים אותן — כל אחת היא קריאה
 * משלה למסד — והשאר נשמר בלחיצה אחת, רק מה שהשתנה (`patchFrom`).
 *
 * הבדיקה המוקדמת (`precheck`) היא אותם כללים שהמסד אוכף, כדי לשמוע "חסרה מידה" לפני השמירה;
 * כשהמסד עונה אחרת, מה שחזר משם הוא מה שמודפס.
 */
const FIELD: Record<string, MessageKey> = {
  size: 'collector.editor.field.size',
  condition: 'collector.editor.field.condition',
  itemType: 'collector.editor.field.itemType',
}
const VALUE_ERROR: Record<string, MessageKey> = {
  playerNumber: 'collector.editor.error.playerNumber',
  askingPrice: 'collector.editor.error.askingPrice',
}
const LOCAL_ERROR: Partial<Record<CollectorError, MessageKey>> = {
  upload_failed: 'collector.editor.error.upload_failed',
  image_unreadable: 'collector.editor.error.image_unreadable',
  too_many_photos: 'collector.editor.error.too_many_photos',
  not_uploaded: 'collector.editor.error.not_uploaded',
  suspended: 'collector.editor.error.suspended',
  not_found: 'collector.editor.error.not_found',
}

function problemText(problem: DraftProblem): string {
  if (problem.error === 'bad_value' && problem.key && VALUE_ERROR[problem.key]) return t(VALUE_ERROR[problem.key] as MessageKey)
  const local = LOCAL_ERROR[problem.error]
  return local ? t(local) : errorLabel(problem.error)
}

export function ItemEditor({
  item,
  shirt,
  copyIndex,
  api,
  onSaved,
  onRemoved,
  onCopy,
  onClose,
}: {
  item: OwnerItem
  shirt: CollectorShirt | undefined
  /** 2 for the second copy of the same shirt, null when there is only one */
  copyIndex: number | null
  api: ClosetApi
  onSaved: (item: OwnerItem) => void
  onRemoved: (itemId: string) => void
  onCopy: (item: OwnerItem) => void
  onClose: () => void
}) {
  const ref = useDialog<HTMLDivElement>(onClose)
  const [draft, setDraft] = useState<Draft>(() => draftOf(item))
  const [photos, setPhotos] = useState<string[]>(item.photos)
  const [problem, setProblem] = useState<DraftProblem | null>(null)
  const [photoError, setPhotoError] = useState<DraftProblem | null>(null)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState<MessageKey | null>(null)
  const [progress, setProgress] = useState<{ n: number; total: number } | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [removing, setRemoving] = useState(false)
  const files = useRef<HTMLInputElement | null>(null)

  const editable = item.state === 'held'
  const missing = new Set(problem?.missing ?? [])
  const patch = patchFrom(item, draft)
  const dirty = Object.keys(patch).length > 0
  const title = shirt ? `${shirt.variantHe} · ${shirtDateText(shirt)}` : item.archiveSlug

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => {
      const next = { ...current, [key]: value }
      // a replica that was marked original loses the claim the moment it becomes a replica
      if (key === 'itemType' && next.authenticityClaim && !claimAllowed(next.itemType, next.authenticityClaim)) next.authenticityClaim = null
      return next
    })
    setProblem(null)
    setNote(null)
  }

  async function save() {
    if (!editable || saving) return
    if (!dirty) {
      setNote('collector.editor.unchanged')
      return
    }
    const early = precheck(draft)
    if (early) {
      setProblem(early)
      return
    }
    setSaving(true)
    const out = await api.itemUpdate(item.id, patch)
    setSaving(false)
    if (!out.ok) {
      setProblem({ error: out.error, missing: out.missing, key: out.key })
      return
    }
    setProblem(null)
    setNote('collector.editor.saved')
    onSaved(out.item)
  }

  async function upload(list: FileList | null) {
    if (!list || list.length === 0) return
    setPhotoError(null)
    const room = LIMITS.photos - photos.length
    const chosen = Array.from(list).slice(0, Math.max(0, room))
    if (chosen.length === 0) {
      setPhotoError({ error: 'too_many_photos' })
      return
    }
    for (let index = 0; index < chosen.length; index += 1) {
      setProgress({ n: index + 1, total: chosen.length })
      const out = await api.photoUpload(item.id, chosen[index] as File)
      if (out.ok) setPhotos(out.photos)
      else setPhotoError({ error: out.error })
    }
    setProgress(null)
    if (files.current) files.current.value = ''
  }

  async function reorder(index: number, by: -1 | 1) {
    const before = photos
    const next = movePhoto(photos, index, by)
    setPhotos(next)
    const out = await api.photoOrder(item.id, next)
    if (out.ok) setPhotos(out.photos)
    else {
      setPhotos(before)
      setPhotoError({ error: out.error })
    }
  }

  async function removePhoto(path: string) {
    const out = await api.photoRemove(path)
    if (out.ok) setPhotos(out.photos)
    else setPhotoError({ error: out.error })
  }

  async function remove() {
    if (removing) return
    setRemoving(true)
    const out = await api.unhave(item.id)
    setRemoving(false)
    if (out.ok) onRemoved(item.id)
    else {
      setConfirmRemove(false)
      setProblem({ error: out.error })
    }
  }

  async function copy() {
    const out = await api.have(item.archiveSlug, item.kitId, true)
    if (out.ok) {
      setNote('collector.editor.copyAdded')
      onCopy(out.item)
    } else setProblem({ error: out.error })
  }

  const chip = (on: boolean, bad = false) =>
    `flex min-h-tap items-center justify-center border-rule px-3 font-body text-step--1 font-extrabold transition-colors disabled:opacity-40 ${
      on ? 'border-ink bg-ink text-paper' : bad ? 'border-red bg-paper text-ink' : 'border-ink/35 bg-paper text-ink'
    }`

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="editor-title"
      tabIndex={-1}
      data-item-editor=""
      className="fixed inset-0 z-[60] flex justify-end bg-ink/50"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="grid h-[100dvh] w-full grid-rows-[auto_minmax(0,1fr)_auto] border-ink bg-paper lg:max-w-[520px] lg:border-s-plate"
      >
        {/* head */}
        <header className="flex items-center gap-3 border-b-rule border-ink bg-sheet px-3 pb-2 pt-[max(8px,env(safe-area-inset-top))]">
          <div className="w-14 shrink-0">
            <ShirtThumb shirt={shirt} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-body text-[10.5px] font-extrabold tracking-widest text-muted">
              {t('collector.editor.title')}
              {copyIndex ? ` · ${t('collector.item.copyN', { n: String(copyIndex) })}` : ''}
            </p>
            <h2 id="editor-title" className="truncate font-display text-step-1 leading-tight text-ink">
              <bdi>{title}</bdi>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('collector.editor.close')}
            className="flex min-h-tap min-w-tap items-center justify-center font-body text-[22px] font-black text-ink"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>

        {/* body */}
        <div className="overflow-y-auto overscroll-contain px-3 pb-6 pt-3">
          {item.state === 'suspended' ? (
            <p role="status" className="border-s-plate border-red bg-sheet py-2 pe-2 ps-3 font-body text-step--1 leading-relaxed text-ink">
              {t('collector.editor.suspended')}
              {item.suspendedReason ? (
                <span className="mt-1 block text-muted">{t('collector.editor.suspendedReason', { reason: item.suspendedReason })}</span>
              ) : null}
            </p>
          ) : !editable ? (
            <p role="status" className="border-s-plate border-sign bg-sheet py-2 pe-2 ps-3 font-body text-step--1 leading-relaxed text-ink">
              {t('collector.editor.busy')}
            </p>
          ) : null}

          {item.wanters > 0 ? (
            <p className="mb-3 bg-red px-3 py-2 font-display text-step-1 leading-tight text-paper">
              {item.wanters === 1 ? t('collector.editor.wantersOne') : t('collector.editor.wanters', { n: String(item.wanters) })}
            </p>
          ) : null}

          <fieldset disabled={!editable} className="space-y-4">
            {/* the market first: it is why anyone opens this sheet */}
            <section aria-labelledby="ed-market" className="border-rule border-ink bg-sheet p-3">
              <h3 id="ed-market" className="font-display text-step-1 leading-none text-ink">
                {t('collector.editor.market')}
              </h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Toggle on={draft.forTrade} label={t('collector.editor.trade')} hint={t('collector.editor.tradeHint')} onChange={(on) => set('forTrade', on)} />
                <Toggle on={draft.forSale} label={t('collector.editor.sale')} hint={t('collector.editor.saleHint')} onChange={(on) => set('forSale', on)} />
              </div>
              {draft.forSale ? (
                <div className="mt-3 grid gap-3">
                  <label className="block">
                    <span className="font-body text-step--1 font-extrabold text-ink">{t('collector.editor.price')}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      value={draft.askingPrice}
                      onChange={(event) => set('askingPrice', event.target.value)}
                      aria-invalid={problem?.key === 'askingPrice' || problem?.error === 'price_required'}
                      className={`mt-1 block min-h-tap w-full border-rule bg-paper px-3 font-poster text-[24px] tabular-nums text-ink ${
                        problem?.key === 'askingPrice' || problem?.error === 'price_required' ? 'border-red' : 'border-ink'
                      }`}
                    />
                  </label>
                  <div role="group" aria-label={t('collector.editor.currency')} className="flex flex-wrap gap-1.5">
                    {CURRENCIES.map((currency) => (
                      <button key={currency} type="button" aria-pressed={draft.currency === currency} onClick={() => set('currency', currency)} className={chip(draft.currency === currency)}>
                        <span dir="ltr">{currency}</span>
                      </button>
                    ))}
                  </div>
                  <Toggle on={draft.openToOffers} label={t('collector.editor.offers')} onChange={(on) => set('openToOffers', on)} />
                </div>
              ) : null}
              <p className="mt-2 font-body text-[11.5px] leading-snug text-muted">{t('collector.editor.noFee')}</p>
            </section>

            <Group title={t('collector.editor.size')} bad={missing.has('size')}>
              {SIZES.map((size) => (
                <button key={size} type="button" aria-pressed={draft.size === size} onClick={() => set('size', draft.size === size ? null : size)} className={chip(draft.size === size, missing.has('size'))}>
                  {sizeLabel(size)}
                </button>
              ))}
            </Group>

            <Group title={t('collector.editor.condition')} bad={missing.has('condition')}>
              {CONDITIONS.map((condition) => (
                <button key={condition} type="button" aria-pressed={draft.condition === condition} onClick={() => set('condition', draft.condition === condition ? null : condition)} className={chip(draft.condition === condition, missing.has('condition'))}>
                  {conditionLabel(condition)}
                </button>
              ))}
            </Group>

            <fieldset className={`border-rule p-3 ${missing.has('itemType') ? 'border-red' : 'border-ink/40'}`}>
              <legend className="px-1 font-display text-step-0 text-ink">{t('collector.editor.type')}</legend>
              <div className="grid gap-1.5">
                {ITEM_TYPES.map((type) => (
                  <label key={type} className={`flex min-h-tap cursor-pointer items-center gap-2.5 border-hair px-3 ${draft.itemType === type ? 'border-ink bg-sheet' : 'border-ink/25'}`}>
                    <input type="radio" name="itemType" value={type} checked={draft.itemType === type} onChange={() => set('itemType', type)} className="h-5 w-5 shrink-0 accent-ink" />
                    <span className="font-body text-step--1 font-bold text-ink">{typeLabel(type)}</span>
                  </label>
                ))}
              </div>
              {isReproduction(draft.itemType) ? (
                <p className="mt-2 border-s-4 border-sign ps-2 font-body text-[12px] leading-snug text-ink">{t('collector.replica.note')}</p>
              ) : null}
            </fieldset>

            <Group title={t('collector.editor.claim')} bad={problem?.error === 'replica_claim'}>
              <button type="button" aria-pressed={draft.authenticityClaim === null} onClick={() => set('authenticityClaim', null)} className={chip(draft.authenticityClaim === null)}>
                {t('collector.editor.claimNone')}
              </button>
              {CLAIMS.map((claim) => (
                <button
                  key={claim}
                  type="button"
                  aria-pressed={draft.authenticityClaim === claim}
                  disabled={!claimAllowed(draft.itemType, claim)}
                  onClick={() => set('authenticityClaim', claim)}
                  className={chip(draft.authenticityClaim === claim)}
                >
                  {claimLabel(claim)}
                </button>
              ))}
              <p className="w-full font-body text-[11.5px] leading-snug text-muted">
                {isReproduction(draft.itemType) ? t('collector.editor.claimBlocked') : t('collector.claim.note')}
              </p>
            </Group>

            <fieldset className="border-rule border-ink/40 p-3">
              <legend className="px-1 font-display text-step-0 text-ink">
                {t('collector.editor.print')} <span className="font-body text-[11px] text-muted">· {t('collector.editor.optional')}</span>
              </legend>
              <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
                <label className="block min-w-0">
                  <span className="font-body text-[12px] font-bold text-muted">{t('collector.editor.printName')}</span>
                  <input type="text" maxLength={LIMITS.playerName} value={draft.playerName} onChange={(event) => set('playerName', event.target.value)} className="mt-1 block min-h-tap w-full border-rule border-ink bg-paper px-3 font-body text-step-0 text-ink" />
                </label>
                <label className="block">
                  <span className="font-body text-[12px] font-bold text-muted">{t('collector.editor.printNumber')}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    maxLength={2}
                    value={draft.playerNumber}
                    onChange={(event) => set('playerNumber', event.target.value)}
                    aria-invalid={problem?.key === 'playerNumber'}
                    className={`mt-1 block min-h-tap w-full border-rule bg-paper px-3 text-center font-poster text-[24px] tabular-nums text-ink ${problem?.key === 'playerNumber' ? 'border-red' : 'border-ink'}`}
                  />
                </label>
              </div>
              <label className="mt-3 block">
                <span className="font-body text-[12px] font-bold text-muted">{t('collector.editor.personalization')}</span>
                <input
                  type="text"
                  maxLength={LIMITS.personalization}
                  placeholder={t('collector.editor.personalizationHint')}
                  value={draft.personalization}
                  onChange={(event) => set('personalization', event.target.value)}
                  className="mt-1 block min-h-tap w-full border-rule border-ink bg-paper px-3 font-body text-step--1 text-ink placeholder:text-muted"
                />
              </label>
            </fieldset>

            <label className="block">
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-display text-step-0 text-ink">{t('collector.editor.description')}</span>
                <span className="font-body text-[11px] text-muted">
                  <Num>{t('collector.editor.chars', { n: String(draft.description.length), max: String(LIMITS.description) })}</Num>
                </span>
              </span>
              <textarea
                rows={4}
                maxLength={LIMITS.description}
                value={draft.description}
                onChange={(event) => set('description', event.target.value)}
                className="mt-1 block w-full border-rule border-ink bg-paper p-3 font-body text-step--1 leading-relaxed text-ink"
              />
            </label>
          </fieldset>

          {/* photos: each one is its own call, and goes the moment it is chosen */}
          <section aria-labelledby="ed-photos" className="mt-4 border-rule border-ink bg-sheet p-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 id="ed-photos" className="font-display text-step-1 leading-none text-ink">
                {t('collector.editor.photos')}
              </h3>
              <span className="font-poster text-[18px] leading-none text-red">
                <Num>{`${photos.length}/${LIMITS.photos}`}</Num>
              </span>
            </div>
            <p className="mt-1 font-body text-[11.5px] leading-snug text-muted">{t('collector.editor.photosHint')}</p>
            {photos.length > 0 ? (
              <ol className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos.map((path, index) => (
                  <li key={path} className="border-rule border-ink bg-paper">
                    <div className="relative aspect-square overflow-hidden">
                      <UserPhoto path={path} />
                      {index === 0 ? (
                        <span className="absolute start-0 top-0 bg-red px-1.5 py-0.5 font-body text-[10.5px] font-extrabold text-paper">
                          {t('collector.editor.photoFirst')}
                        </span>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-3 border-t-hair border-ink/40">
                      <button type="button" disabled={!editable || index === 0} onClick={() => void reorder(index, -1)} aria-label={t('collector.editor.photoUp', { n: String(index + 1) })} className="min-h-tap font-body text-[16px] font-black text-ink disabled:opacity-30">
                        <span aria-hidden="true">→</span>
                      </button>
                      <button type="button" disabled={!editable || index === photos.length - 1} onClick={() => void reorder(index, 1)} aria-label={t('collector.editor.photoDown', { n: String(index + 1) })} className="min-h-tap border-x-hair border-ink/40 font-body text-[16px] font-black text-ink disabled:opacity-30">
                        <span aria-hidden="true">←</span>
                      </button>
                      <button type="button" disabled={!editable} onClick={() => void removePhoto(path)} aria-label={t('collector.editor.photoRemove', { n: String(index + 1) })} className="min-h-tap font-body text-[16px] font-black text-red disabled:opacity-30">
                        <span aria-hidden="true">✕</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}
            {editable ? (
              photos.length < LIMITS.photos ? (
                <label className="mt-2 flex min-h-tap cursor-pointer items-center justify-center border-rule border-dashed border-ink bg-paper px-3 font-body text-step--1 font-extrabold text-ink focus-within:outline focus-within:outline-[3px] focus-within:outline-red">
                  <input ref={files} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => void upload(event.target.files)} disabled={progress !== null} />
                  {progress ? t('collector.editor.uploading', { n: String(progress.n), total: String(progress.total) }) : `+ ${t('collector.editor.photoAdd')}`}
                </label>
              ) : (
                <p className="mt-2 font-body text-[12px] text-muted">{t('collector.editor.photoFull')}</p>
              )
            ) : null}
            {progress ? (
              <div aria-hidden="true" className="mt-1.5 h-1.5 bg-ink/15">
                <div className="h-full bg-red transition-[width]" style={{ width: `${Math.round((progress.n / progress.total) * 100)}%` }} />
              </div>
            ) : null}
            {photoError ? (
              <p role="alert" className="mt-2 font-body text-step--1 font-bold text-red">
                {problemText(photoError)}
              </p>
            ) : null}
          </section>

          {/* the auction, the market page, another copy, and the way out */}
          <section className="mt-4 grid gap-2">
            {item.lot ? (
              <a href={`/kits/auction/${item.lot.id}`} className="flex min-h-tap items-center justify-center bg-sign px-3 font-body text-step--1 font-extrabold text-paper">
                {t('collector.editor.lot')}
              </a>
            ) : editable ? (
              <a href={`/kits/auction/submit/${item.id}`} className="block border-rule border-ink bg-sheet px-3 py-2.5">
                <span className="block font-body text-step--1 font-extrabold text-ink">{t('collector.editor.auction')}</span>
                <span className="mt-0.5 block font-body text-[11.5px] leading-snug text-muted">{t('collector.editor.auctionHint')}</span>
              </a>
            ) : null}
            {(item.forSale || item.forTrade) && item.state === 'held' ? (
              <a href={`/kits/market/item/${item.id}`} className="flex min-h-tap items-center font-body text-step--1 font-extrabold text-sign underline underline-offset-4">
                {t('collector.editor.viewMarket')}
              </a>
            ) : null}
            <button type="button" onClick={() => void copy()} className="flex min-h-tap items-center justify-center border-rule border-ink bg-paper px-3 font-body text-step--1 font-extrabold text-ink">
              {t('collector.editor.copy')}
            </button>
            {item.state === 'held' || item.state === 'suspended' ? (
              confirmRemove ? (
                <div role="group" className="border-rule border-red bg-sheet p-3">
                  <p className="font-body text-step--1 font-bold text-ink">{t('collector.editor.removeConfirm')}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => void remove()} disabled={removing} className="min-h-tap bg-red px-3 font-body text-step--1 font-extrabold text-paper disabled:opacity-60">
                      {t('collector.editor.removeYes')}
                    </button>
                    <button type="button" onClick={() => setConfirmRemove(false)} className="min-h-tap border-rule border-ink px-3 font-body text-step--1 font-extrabold text-ink">
                      {t('collector.editor.removeNo')}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmRemove(true)} className="min-h-tap px-2 font-body text-step--1 font-extrabold text-red underline underline-offset-4">
                  {t('collector.editor.remove')}
                </button>
              )
            ) : null}
          </section>
        </div>

        {/* the save bar — always on the glass */}
        <footer className="border-t-rule border-ink bg-sheet px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
          {problem ? (
            <p role="alert" className="mb-1.5 font-body text-step--1 font-bold leading-snug text-red">
              {problemText(problem)}
              {problem.missing && problem.missing.length > 0 ? (
                <span className="block font-normal text-ink">
                  {t('collector.editor.missing', { fields: problem.missing.map((key) => (FIELD[key] ? t(FIELD[key] as MessageKey) : key)).join(', ') })}
                </span>
              ) : null}
            </p>
          ) : note ? (
            <p role="status" className="mb-1.5 font-body text-step--1 font-bold text-sign">
              {t(note)}
            </p>
          ) : null}
          {editable ? (
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              data-editor-save=""
              className="flex min-h-tap w-full items-center justify-center bg-red px-4 font-body text-step-0 font-extrabold text-paper disabled:opacity-60"
            >
              {saving ? t('collector.editor.saving') : t('collector.editor.save')}
            </button>
          ) : (
            <button type="button" onClick={onClose} className="flex min-h-tap w-full items-center justify-center border-rule border-ink px-4 font-body text-step-0 font-extrabold text-ink">
              {t('collector.editor.close')}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}

function Group({ title, bad = false, children }: { title: string; bad?: boolean; children: React.ReactNode }) {
  return (
    <fieldset className={`border-rule p-3 ${bad ? 'border-red' : 'border-ink/40'}`}>
      <legend className="px-1 font-display text-step-0 text-ink">{title}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  )
}

function Toggle({ on, label, hint, onChange }: { on: boolean; label: string; hint?: string; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`flex min-h-tap w-full items-center gap-3 border-rule px-3 py-2 text-start ${on ? 'border-red bg-red text-paper' : 'border-ink bg-paper text-ink'}`}
    >
      <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center border-rule font-body text-[14px] font-black ${on ? 'border-paper bg-paper text-red' : 'border-ink'}`}>
        {on ? '✓' : ''}
      </span>
      <span className="min-w-0">
        <span className="block font-body text-step--1 font-extrabold">{label}</span>
        {hint ? <span className={`block font-body text-[11.5px] leading-snug ${on ? 'text-paper/85' : 'text-muted'}`}>{hint}</span> : null}
      </span>
    </button>
  )
}
