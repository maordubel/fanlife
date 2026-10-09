'use client'

import { useCallback, useEffect, useState } from 'react'

import { Num } from '@/components/ui/Num'
import { type CollectorShirt, type Currency, type Result } from '@/lib/collector/types'
import { errorLabel } from '@/lib/fanlife/collector/labels'
import { currencySymbol, shirtName } from '@/lib/fanlife/collector/market'
import { bundleOffer, dealExtras, feedbackGive, handoverSent, handoverSet } from '@/lib/fanlife/hub/api'
import { h } from '@/lib/fanlife/hub/copy'
import type { DealExtras, FeedbackRating, HandoverMethod } from '@/lib/fanlife/hub/types'

import { buttonPrimary, buttonQuiet, Kicker } from './HubParts'

const OPEN = ['requested', 'accepted', 'negotiating']

/**
 * The deal's second half: a bundle offer, how it is handed over, and one word afterwards. It sits under
 * the thread (`ThreadScreen`, a fork of The Worker's) and reads its own state — nothing here edits the fork.
 * Money and parcels never pass through FAN LIFE; these panels only record what two people agree.
 */
export function DealPanels({ id, shirts }: { id: string; shirts: Record<string, CollectorShirt> }) {
  const [x, setX] = useState<DealExtras | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    const out = await dealExtras(id)
    if (out.ok) setX(out)
  }, [id])
  useEffect(() => {
    void load()
    const t = window.setInterval(() => void load(), 15000)
    return () => window.clearInterval(t)
  }, [load])

  const run = async (fn: () => Promise<Result<unknown>>, ok?: string) => {
    setErr(null)
    const out = await fn()
    if (!out.ok) setErr(h('hub.deal.error', { why: errorLabel(out.error) }))
    else if (ok) setNote(ok)
    await load()
  }

  if (!x) return null
  const showBundle = x.kind === 'buy' && OPEN.includes(x.status)
  const showHandover = x.status === 'agreed'
  const showFeedback = x.status === 'completed'
  if (!showBundle && !showHandover && !showFeedback) return null

  return (
    <section className="mt-stack border-rule border-ink bg-sheet p-4" aria-label={h('hub.deal.title')}>
      <Kicker>{h('hub.deal.title')}</Kicker>
      {err ? <p role="alert" className="mt-2 font-body text-step--1 font-extrabold text-red">{err}</p> : null}
      {note ? <p role="status" className="mt-2 font-body text-step--1 font-extrabold text-sign">{note}</p> : null}
      {showBundle ? <Bundle x={x} shirts={shirts} onSend={(amount, cur, items) => run(() => bundleOffer(id, amount, cur, items), h('hub.deal.bundleSent'))} /> : null}
      {showHandover ? (
        <Handover
          x={x}
          onSet={(m, n) => run(() => handoverSet(id, m, n))}
          onSent={() => run(() => handoverSent(id), h('hub.deal.sentMineDone'))}
        />
      ) : null}
      {showFeedback ? <Feedback x={x} onGive={(r, n) => run(() => feedbackGive(id, r, n), h('hub.deal.feedbackThanks'))} /> : null}
    </section>
  )
}

function Bundle({ x, shirts, onSend }: { x: DealExtras; shirts: Record<string, CollectorShirt>; onSend: (amount: number, cur: Currency, items: string[]) => void }) {
  const [picked, setPicked] = useState<string[]>([])
  const [price, setPrice] = useState('')
  const [cur, setCur] = useState<Currency>('EUR')
  const amount = Number(price.replace(',', '.'))
  const ready = picked.length >= 1 && Number.isFinite(amount) && amount > 0
  return (
    <div className="mt-3 border-t-hair border-dashed border-ink/45 pt-3">
      <p className="font-sign text-step-0 text-ink">{h('hub.deal.bundleTitle')}</p>
      {x.bundleItems.length === 0 ? (
        <p className="mt-1 font-body text-step--1 text-muted">{h('hub.deal.bundleNone')}</p>
      ) : (
        <>
          <p className="mt-1 max-w-prose font-body text-step--1 text-ink">{h('hub.deal.bundleBody')}</p>
          <ul className="mt-2 flex flex-col gap-1">
            {x.bundleItems.map((item) => {
              const on = picked.includes(item.id)
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPicked((p) => (on ? p.filter((i) => i !== item.id) : p.length < 5 ? [...p, item.id] : p))}
                    className={`flex min-h-tap w-full items-center justify-between gap-2 border-hair px-3 text-start font-body text-[13px] font-extrabold ${on ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-paper text-ink'}`}
                  >
                    <span>{shirtName(shirts[item.archiveSlug]) || item.archiveSlug}{item.size ? ` · ${item.size.toUpperCase()}` : ''}</span>
                    {item.askingPrice ? <span><Num>{`${currencySymbol(item.currency)}${item.askingPrice}`}</Num></span> : null}
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="font-body text-[11px] font-extrabold uppercase text-muted">
              {h('hub.deal.bundlePrice')}
              <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 block min-h-tap w-32 border-rule border-ink bg-paper px-3 font-body text-[14px] text-ink" />
            </label>
            <select aria-label="Currency" value={cur} onChange={(e) => setCur(e.target.value as Currency)} className="min-h-tap border-rule border-ink bg-paper px-2 font-body text-[13px] text-ink">
              <option value="EUR">EUR</option>
            </select>
            <button type="button" disabled={!ready} onClick={() => onSend(amount, cur, picked)} className={`${buttonPrimary} min-h-tap`}>
              {h('hub.deal.bundleSend')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Handover({ x, onSet, onSent }: { x: DealExtras; onSet: (m: HandoverMethod, note: string) => void; onSent: () => void }) {
  const [method, setMethod] = useState<HandoverMethod>(x.handover?.method ?? 'meet')
  const [text, setText] = useState(x.handover?.note ?? '')
  return (
    <div className="mt-3 border-t-hair border-dashed border-ink/45 pt-3">
      <p className="font-sign text-step-0 text-ink">{h('hub.deal.handoverTitle')}</p>
      <p className="mt-1 max-w-prose font-body text-step--1 text-ink">{h('hub.deal.handoverBody')}</p>
      {x.handover ? (
        <p className="mt-2 font-body text-step--1 font-extrabold text-sign">
          {h('hub.deal.current', { method: h(x.handover.method === 'meet' ? 'hub.deal.meet' : 'hub.deal.ship') })}
          {x.handover.note ? ` — ${x.handover.note}` : ''}
        </p>
      ) : null}
      <div className="mt-2 flex gap-1" role="group" aria-label={h('hub.deal.handoverTitle')}>
        {(['meet', 'ship'] as const).map((m) => (
          <button key={m} type="button" aria-pressed={method === m} onClick={() => setMethod(m)}
            className={`min-h-tap flex-1 border-hair px-3 font-body text-[12.5px] font-extrabold ${method === m ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-paper text-ink'}`}>
            {h(m === 'meet' ? 'hub.deal.meet' : 'hub.deal.ship')}
          </button>
        ))}
      </div>
      <label className="mt-2 block font-body text-[11px] font-extrabold uppercase text-muted">
        {h('hub.deal.noteLabel')}
        <input value={text} maxLength={140} onChange={(e) => setText(e.target.value)} className="mt-1 block min-h-tap w-full border-rule border-ink bg-paper px-3 font-body text-[14px] text-ink" />
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => onSet(method, text)} className={`${buttonPrimary} min-h-tap`}>{h('hub.deal.set')}</button>
        <button type="button" disabled={x.mySent} onClick={onSent} className={`${buttonQuiet} min-h-tap`}>{x.mySent ? h('hub.deal.sentMineDone') : h('hub.deal.sentMine')}</button>
      </div>
      {x.theirSent ? <p className="mt-2 font-body text-step--1 font-extrabold text-sign" role="status">{h('hub.deal.sentTheirs')}</p> : null}
      <p className="mt-2 max-w-prose font-body text-[12px] text-muted">{h('hub.deal.reminder')}</p>
    </div>
  )
}

function Feedback({ x, onGive }: { x: DealExtras; onGive: (r: FeedbackRating, note: string) => void }) {
  const [text, setText] = useState('')
  return (
    <div className="mt-3 border-t-hair border-dashed border-ink/45 pt-3">
      <p className="font-sign text-step-0 text-ink">{h('hub.deal.feedbackTitle')}</p>
      <p className="mt-1 font-body text-step--1 text-ink">{h('hub.deal.feedbackBody')}</p>
      {x.feedbackReceived ? (
        <p className="mt-2 font-body text-step--1 font-extrabold text-sign">
          {h('hub.deal.received', { rating: h(`hub.deal.${x.feedbackReceived.rating}` as const) })}
          {x.feedbackReceived.note ? ` ${h('hub.deal.receivedNote', { note: x.feedbackReceived.note })}` : ''}
        </p>
      ) : null}
      {x.feedbackGiven ? (
        <p className="mt-2 font-body text-step--1 font-extrabold text-sign" role="status">{h('hub.deal.feedbackThanks')}</p>
      ) : (
        <>
          <label className="mt-2 block font-body text-[11px] font-extrabold uppercase text-muted">
            {h('hub.deal.feedbackNote')}
            <input value={text} maxLength={140} onChange={(e) => setText(e.target.value)} className="mt-1 block min-h-tap w-full border-rule border-ink bg-paper px-3 font-body text-[14px] text-ink" />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {(['good', 'fine', 'bad'] as const).map((r) => (
              <button key={r} type="button" onClick={() => onGive(r, text)} className={`${r === 'good' ? buttonPrimary : buttonQuiet} min-h-tap`}>
                {h(`hub.deal.${r}` as const)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
