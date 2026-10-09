'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { ArchivePhoto, ShirtDate } from '@/components/fanlife/market/ShirtBits'
import { errorLabel, sizeLabel } from '@/lib/fanlife/collector/labels'
import { SIZES } from '@/lib/collector/types'
import type { CollectorShirt, Currency, Size } from '@/lib/collector/types'
import { wantRequest } from '@/lib/fanlife/hub/api'
import type { Delivery, MyWant, WantMode } from '@/lib/fanlife/hub/types'
import { h } from '@/lib/fanlife/hub/copy'

import { Chip, buttonPlain, buttonPrimary } from './HubParts'

type PickShirt = CollectorShirt & { clubName?: string }

/**
 * "Looking for a shirt": choose the archive shirt, the size, how you would like to get it, a short public
 * note — and a PRIVATE budget that only you ever see. A request can stay private (it still alerts you when a
 * copy opens) or be shown on the wanted board. Sits above the tab bar (z-[60]).
 */
export function RequestSheet({
  shirts,
  start,
  existing,
  onClose,
  onSaved,
}: {
  shirts: Readonly<Record<string, PickShirt>>
  /** a shirt already in focus (from the filters) */
  start: string | null
  existing: readonly MyWant[]
  onClose: () => void
  onSaved: (publicRequest: boolean) => void
}) {
  const [slug, setSlug] = useState<string | null>(start)
  const [q, setQ] = useState('')
  const [size, setSize] = useState<Size | null>(null)
  const [mode, setMode] = useState<WantMode>('any')
  const [delivery, setDelivery] = useState<Delivery>('both')
  const [note, setNote] = useState('')
  const [budget, setBudget] = useState('')
  const [currency, setCurrency] = useState<Currency>('EUR')
  const [isPublic, setPublic] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const first = useRef<HTMLInputElement>(null)

  useEffect(() => {
    first.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // an existing request for the shirt pre-fills the form: choosing a shirt you already asked for edits it
  useEffect(() => {
    const have = slug ? existing.find((w) => w.archiveSlug === slug) : null
    if (!have) return
    setSize(have.size)
    setMode(have.mode)
    setDelivery(have.delivery)
    setNote(have.note ?? '')
    setBudget(have.maxPrice ? String(have.maxPrice) : '')
    setCurrency(have.currency)
    setPublic(have.public)
  }, [slug, existing])

  const hits = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return []
    return Object.values(shirts)
      .filter((s) => {
        const hay = `${s.clubName ?? ''} ${s.variantHe} ${s.seasonLabel ?? ''} ${s.yearRaw ?? ''}`.toLowerCase()
        return words.every((w) => hay.includes(w))
      })
      .slice(0, 8)
  }, [q, shirts])
  const shirt = slug ? shirts[slug] : null

  const submit = async () => {
    if (!slug) return
    const n = Number(budget.replace(',', '.'))
    setBusy(true)
    setError(null)
    const out = await wantRequest({ slug, size, mode, delivery, note, maxPrice: Number.isFinite(n) && n > 0 ? n : null, currency, public: isPublic })
    setBusy(false)
    if (out.ok) onSaved(isPublic)
    else setError(errorLabel(out.error))
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 sm:items-center" role="dialog" aria-modal="true" aria-label={h('hub.request.title')}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto border-plate border-ink bg-paper p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-step-1 leading-tight text-ink">{h('hub.request.title')}</h2>
          <button type="button" onClick={onClose} aria-label={h('hub.close')} className="min-h-tap min-w-tap font-body text-step-0 font-extrabold text-ink">✕</button>
        </div>
        <p className="mt-1 font-body text-[12.5px] leading-snug text-muted">{h('hub.request.lede')}</p>

        {shirt ? (
          <div className="mt-3 flex items-center gap-3 border-rule border-ink bg-sheet p-2">
            <span className="block w-[56px] shrink-0"><ArchivePhoto shirt={shirt} eager /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-poster text-[20px] leading-none text-ink"><ShirtDate shirt={shirt} /></span>
              <span className="block truncate font-body text-[12px] font-extrabold text-red">{shirt.variantHe}</span>
            </span>
            <button type="button" onClick={() => setSlug(null)} className="min-h-tap font-body text-[12px] font-extrabold text-sign underline underline-offset-4">{h('hub.request.change')}</button>
          </div>
        ) : (
          <div className="mt-3">
            <label htmlFor="hub-req-q" className="font-body text-[11px] font-extrabold uppercase tracking-wide text-muted">{h('hub.request.pick')}</label>
            <input
              id="hub-req-q"
              ref={first}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={h('hub.request.search')}
              className="mt-1 min-h-tap w-full border-rule border-ink bg-sheet px-3 font-body text-[14px] text-ink"
            />
            <ul className="mt-1">
              {hits.map((s) => (
                <li key={s.slug}>
                  <button type="button" onClick={() => setSlug(s.slug)} className="flex min-h-tap w-full items-center gap-3 border-b-hair border-dashed border-ink/40 py-1.5 text-start">
                    <span className="block w-[40px] shrink-0"><ArchivePhoto shirt={s} /></span>
                    <span className="min-w-0 flex-1 truncate font-body text-[13px] font-extrabold text-ink">{s.variantHe}</span>
                    <span className="font-poster text-[16px] text-ink"><ShirtDate shirt={s} /></span>
                  </button>
                </li>
              ))}
            </ul>
            {q && hits.length === 0 ? <p className="mt-2 font-body text-[12.5px] text-muted">{h('hub.request.noShirt')}</p> : null}
          </div>
        )}

        {shirt ? (
          <>
            <fieldset className="mt-3">
              <legend className="font-body text-[11px] font-extrabold uppercase tracking-wide text-muted">{h('hub.request.size')}</legend>
              <div className="mt-1 flex flex-wrap gap-1">
                <Chip on={size === null} onClick={() => setSize(null)} label={h('hub.request.anySize')} />
                {SIZES.map((s) => (
                  <Chip key={s} on={size === s} onClick={() => setSize(s)} label={sizeLabel(s)} />
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-3">
              <legend className="font-body text-[11px] font-extrabold uppercase tracking-wide text-muted">{h('hub.request.how')}</legend>
              <div className="mt-1 flex flex-wrap gap-1">
                <Chip on={mode === 'any'} onClick={() => setMode('any')} label={h('hub.mode.any')} />
                <Chip on={mode === 'buy'} onClick={() => setMode('buy')} label={h('hub.mode.buy')} />
                <Chip on={mode === 'swap'} onClick={() => setMode('swap')} label={h('hub.mode.swap')} />
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                <Chip on={delivery === 'both'} onClick={() => setDelivery('both')} label={h('hub.delivery.both')} />
                <Chip on={delivery === 'ship'} onClick={() => setDelivery('ship')} label={h('hub.delivery.ship')} />
                <Chip on={delivery === 'local'} onClick={() => setDelivery('local')} label={h('hub.delivery.local')} />
              </div>
            </fieldset>
            <label className="mt-3 block">
              <span className="font-body text-[11px] font-extrabold uppercase tracking-wide text-muted">{h('hub.request.note')}</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 140))}
                rows={2}
                placeholder={h('hub.request.notePlaceholder')}
                className="mt-1 w-full border-rule border-ink bg-sheet p-2 font-body text-[14px] text-ink"
              />
              <span className="block text-end font-body text-[10.5px] text-muted">{note.length}/140</span>
            </label>
            <div className="mt-2 border-rule border-dashed border-ink/60 bg-sheet p-2.5">
              <label htmlFor="hub-req-budget" className="font-body text-[11px] font-extrabold uppercase tracking-wide text-muted">{h('hub.request.budget')}</label>
              <div className="mt-1 flex items-center gap-2">
                <input id="hub-req-budget" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} className="min-h-tap w-28 border-hair border-ink/40 bg-paper px-2 font-body text-[14px] text-ink" />
                <select aria-label={h('hub.price.currency')} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className="min-h-tap border-hair border-ink/40 bg-paper px-1 font-body text-[14px] text-ink">
                  <option value="EUR">EUR</option>
                  <option value="ILS">ILS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <p className="mt-1 font-body text-[11.5px] leading-snug text-muted">{h('hub.request.budgetPrivate')}</p>
            </div>
            <label className="mt-3 flex min-h-tap items-start gap-2">
              <input type="checkbox" checked={isPublic} onChange={(e) => setPublic(e.target.checked)} className="mt-1 h-4 w-4" />
              <span className="font-body text-[13px] leading-snug text-ink">
                <span className="block font-extrabold">{h('hub.request.public')}</span>
                <span className="block text-muted">{isPublic ? h('hub.request.publicOn') : h('hub.request.publicOff')}</span>
              </span>
            </label>
          </>
        ) : null}

        {error ? <p className="mt-2 font-body text-[13px] font-extrabold text-red" role="alert">{error}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => void submit()} disabled={!slug || busy} className={buttonPrimary}>{busy ? h('hub.saving') : h('hub.request.save')}</button>
          <button type="button" onClick={onClose} className={buttonPlain}>{h('hub.cancel')}</button>
        </div>
      </div>
    </div>
  )
}
