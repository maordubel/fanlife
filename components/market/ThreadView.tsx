'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { CollectorTag } from '@/components/collector/CollectorTag'
import { ItemFacts } from '@/components/collector/ItemFacts'
import { Num } from '@/components/ui/Num'
import { handleLabel } from '@/lib/collector/labels'
import {
  counterpart,
  currencySymbol,
  mySide,
  offerOfMessage,
  openOfferFromOther,
  senderName,
  shirtName,
  stampTime,
  statusLabel,
  systemSentence,
  threadActions,
  type ThreadActions,
} from '@/lib/collector/market'
import { CURRENCIES, type CollectorShirt, type Currency, type OwnerItem, type Thread, type ThreadMessage } from '@/lib/collector/types'
import { t, type MessageKey } from '@/lib/i18n'

import { itemHref } from './CopyTicket'
import { DealRail } from './DealRail'
import { DealSuccess } from './DealSuccess'
import { OfferSlip } from './OfferSlip'
import { SafetyLinks, SafetySheet } from './SafetySheet'
import { ArchivePhoto, Kicker, ShirtDate } from './ShirtBits'

export type ThreadHandlers = {
  respond: (accept: boolean) => void
  send: (body: string) => Promise<boolean>
  photoRequest: () => void
  offerPrice: (amount: number, currency: Currency) => Promise<boolean>
  offerTrade: (itemIds: string[]) => Promise<boolean>
  answer: (offerId: string, action: 'accept' | 'decline') => void
  counter: (offerId: string, amount: number) => Promise<boolean>
  step: (which: 'agreed' | 'done' | 'cancel') => void
  loadTradeItems: () => void
  addToCloset: (slug: string, kitId: string | null) => Promise<boolean>
}

const CURRENCY: Record<Currency, MessageKey> = {
  ILS: 'market.currency.ILS',
  EUR: 'market.currency.EUR',
  USD: 'market.currency.USD',
}

const TRADE_MAX = 6

/**
 * השיחה (מפרט §15–§18) — the conversation inside The Worker, and the structured actions that let the
 * system understand where a deal stands: הצע מחיר, הצע החלפה, בקש תמונה נוספת, קבל / דחה / הצע ₪
 * אחר, סמן שסוכם, סמן שהעסקה הושלמה, בטל / לא הסתדר, דווח, חסום. Which of them a side sees in which
 * status is `threadActions()` — one pure function, tested, mirroring the database's own checks.
 *
 * No contact details are asked for or shown, and a line says they are not needed (§18). No payment
 * happens here (§17, §39). On a wide screen the copy sits in a column beside the conversation.
 */
export function ThreadView({
  thread,
  shirts,
  tradeItems,
  busy,
  error,
  on,
  onBlocked,
}: {
  thread: Thread
  shirts: Readonly<Record<string, CollectorShirt>>
  /** my own copies open for trade, from the closet — null until asked for */
  tradeItems: OwnerItem[] | null
  busy: boolean
  error: string | null
  on: ThreadHandlers
  onBlocked?: () => void
}) {
  const [sheet, setSheet] = useState<'report' | 'block' | null>(null)
  const other = counterpart(thread)
  const fromOther = openOfferFromOther(thread)
  const can = threadActions(thread.connection, fromOther)
  const status = thread.connection.status
  const item = thread.item
  const shirt = item ? (shirts[item.archiveSlug] ?? null) : null

  const notes = (
    <div className="flex flex-col gap-2 border-rule border-ink/40 bg-paper p-3" data-thread-notes="">
      <p className="font-body text-[12px] leading-snug text-ink">{t('market.thread.noContact')}</p>
      <p className="font-body text-[12px] leading-snug text-ink">{t('market.thread.noPayment')}</p>
      <p className="font-body text-[11.5px] leading-snug text-muted">{t('market.safety')}</p>
      {can.report || can.block ? (
        <SafetyLinks onReport={() => setSheet('report')} onBlock={() => setSheet('block')} />
      ) : null}
    </div>
  )

  return (
    <div className="mt-stack">
      <Link
        href={item ? itemHref(item.id) : '/kits/market'}
        className="inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-red underline underline-offset-4"
      >
        ← {item ? shirtName(shirt) : t('market.toMarket')}
      </Link>

      <div className="mt-3 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-3 lg:sticky lg:top-4">
          <section className="border-plate border-ink bg-sheet" aria-labelledby="thread-about">
            <header className="flex items-center justify-between gap-2 bg-ink px-3 py-2 text-paper">
              <Kicker tone="paper">{thread.connection.kind === 'buy' ? t('market.thread.kind.buy') : t('market.thread.kind.trade')}</Kicker>
              <span className="font-body text-[11px] font-extrabold">{statusLabel(status)}</span>
            </header>
            <div className="flex gap-3 p-3">
              <span className="block w-[72px] shrink-0 lg:w-[96px]">{shirt ? <ArchivePhoto shirt={shirt} /> : null}</span>
              <div className="min-w-0 flex-1">
                <p id="thread-about" className="font-body text-[10.5px] font-extrabold tracking-widest text-muted">
                  {t('market.thread.about')}
                </p>
                {shirt ? (
                  <p className="font-poster text-[24px] leading-none text-ink">
                    <ShirtDate shirt={shirt} />
                  </p>
                ) : null}
                <p className="truncate font-body text-[12px] font-extrabold text-red">{shirt?.variantHe ?? t('market.shirt.unknown')}</p>
                {item ? (
                  <div className="mt-1">
                    <ItemFacts item={item} />
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2 border-t-hair border-ink/30 px-3 py-2">
              <span className="font-body text-[11px] font-extrabold text-muted">{t('market.thread.with')}</span>
              <CollectorTag label={other} />
            </div>
          </section>
          <DealRail status={status} />
          <div className="hidden lg:block">{notes}</div>
        </aside>

        <div className="mt-stack flex min-w-0 flex-col gap-3 lg:mt-0">
          <DealSuccess thread={thread} shirts={shirts} onAdd={on.addToCloset} />

          <Conversation thread={thread} shirts={shirts} forShirt={shirt} can={can} busy={busy} on={on} />

          {error ? (
            <p role="alert" className="border-rule border-red bg-paper p-2 font-body text-step--1 font-bold text-red">
              {error}
            </p>
          ) : null}

          <Actions thread={thread} can={can} busy={busy} tradeItems={tradeItems} shirts={shirts} on={on} />

          <div className="lg:hidden">{notes}</div>
        </div>
      </div>

      {sheet ? (
        <SafetySheet
          mode={sheet}
          who={other}
          target={{ connectionId: thread.connection.id }}
          onClose={() => setSheet(null)}
          onDone={(mode) => (mode === 'block' ? onBlocked?.() : undefined)}
        />
      ) : null}
    </div>
  )
}

/** The messages, oldest first; on a wide screen the list scrolls inside itself and keeps the end in view. */
function Conversation({
  thread,
  shirts,
  forShirt,
  can,
  busy,
  on,
}: {
  thread: Thread
  shirts: Readonly<Record<string, CollectorShirt>>
  forShirt: CollectorShirt | null
  can: ThreadActions
  busy: boolean
  on: ThreadHandlers
}) {
  const list = useRef<HTMLOListElement>(null)
  const count = thread.messages.length
  useEffect(() => {
    const el = list.current
    if (el && el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight
  }, [count])
  const me = mySide(thread)

  return (
    <ol
      ref={list}
      aria-label={t('market.thread.title')}
      className="paper flex flex-col gap-2.5 border-rule border-ink p-3 lg:max-h-[62vh] lg:overflow-y-auto"
      data-thread-messages=""
    >
      {count === 0 ? <li className="py-4 text-center font-body text-step--1 text-muted">{t('market.thread.empty')}</li> : null}
      {thread.messages.map((message) => (
        <Message key={message.id} thread={thread} message={message} me={me} shirts={shirts} forShirt={forShirt} can={can} busy={busy} on={on} />
      ))}
    </ol>
  )
}

function Message({
  thread,
  message,
  me,
  shirts,
  forShirt,
  can,
  busy,
  on,
}: {
  thread: Thread
  message: ThreadMessage
  me: ReturnType<typeof mySide>
  shirts: Readonly<Record<string, CollectorShirt>>
  forShirt: CollectorShirt | null
  can: ThreadActions
  busy: boolean
  on: ThreadHandlers
}) {
  const mine = message.from !== 'system' && message.from === me
  const name = senderName(thread, message.from)

  if (message.kind === 'system') {
    const done = message.body === 'completed'
    return (
      <li className="flex items-center gap-2 py-1" data-message="system">
        <span aria-hidden="true" className="h-px flex-1 bg-ink/30" />
        <span className={`max-w-[80%] text-center font-body text-[11.5px] leading-snug ${done ? 'font-extrabold text-red' : 'font-bold text-muted'}`}>
          {systemSentence(message.body)}
          <span className="ms-1.5 whitespace-nowrap font-normal">
            <Num>{stampTime(message.createdAt)}</Num>
          </span>
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-ink/30" />
      </li>
    )
  }

  if (message.kind === 'offer') {
    const offer = offerOfMessage(thread, message)
    if (!offer) return null
    const by = offer.from === me ? 'me' : offer.from === 'initiator' ? thread.initiator : thread.recipient
    const answerable = can.answerOffer && offer.status === 'open' && offer.from !== me
    return (
      <li className="flex py-1" data-message="offer">
        <OfferSlip
          offer={offer}
          by={by}
          shirts={shirts}
          forShirt={forShirt}
          canAnswer={answerable}
          canCounter={answerable && can.counter && offer.kind === 'price'}
          busy={busy}
          onAccept={() => on.answer(offer.id, 'accept')}
          onDecline={() => on.answer(offer.id, 'decline')}
          onCounter={(amount) => on.counter(offer.id, amount)}
        />
      </li>
    )
  }

  if (message.kind === 'photo_request') {
    return (
      <li className={`flex max-w-[88%] flex-col ${mine ? 'self-end items-end' : 'self-start items-start'}`} data-message="photo_request">
        <p className="border-rule border-dashed border-sign bg-sheet px-3 py-2 font-body text-[12.5px] font-bold text-sign">
          {mine ? t('market.msg.photoRequest.mine') : <><bdi>{name}</bdi> {t('market.msg.photoRequest')}</>}
        </p>
        {!mine && thread.connection.role === 'recipient' ? (
          <Link href="/kits/closet" className="mt-0.5 inline-flex min-h-tap items-center font-body text-[12px] font-extrabold text-sign underline underline-offset-4">
            {t('market.msg.photoRequest.upload')}
          </Link>
        ) : null}
      </li>
    )
  }

  return (
    <li className={`flex max-w-[85%] flex-col gap-0.5 ${mine ? 'self-end items-end' : 'self-start items-start'}`} data-message="text">
      <span className="flex items-baseline gap-2 font-body text-[10.5px] text-muted">
        <bdi className="font-extrabold text-ink">{name}</bdi>
        <span className="whitespace-nowrap">
          <Num>{stampTime(message.createdAt)}</Num>
        </span>
      </span>
      <p
        className={`whitespace-pre-line break-words border-rule px-3 py-2 font-body text-step--1 leading-relaxed ${
          mine ? 'border-ink bg-ink text-paper' : 'border-ink bg-sheet text-ink'
        }`}
      >
        <bdi>{message.body}</bdi>
      </p>
    </li>
  )
}

/** The structured actions, grouped the way a deal moves: the request, the offers, the steps, the message. */
function Actions({
  thread,
  can,
  busy,
  tradeItems,
  shirts,
  on,
}: {
  thread: Thread
  can: ThreadActions
  busy: boolean
  tradeItems: OwnerItem[] | null
  shirts: Readonly<Record<string, CollectorShirt>>
  on: ThreadHandlers
}) {
  const [tool, setTool] = useState<'price' | 'trade' | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const status = thread.connection.status
  const who = handleLabel(counterpart(thread))
  const tools = can.offerPrice || can.offerTrade || can.photoRequest
  const steps = can.agreed || can.done || can.waiting || can.cancel

  return (
    <div className="flex flex-col gap-3" data-thread-actions="">
      {can.respond ? (
        <section className="border-plate border-red bg-paper p-3" data-thread-request="">
          <p className="font-display text-step-1 leading-tight text-ink">
            {thread.connection.kind === 'buy' ? t('market.request.incoming.buy', { who }) : t('market.request.incoming.trade', { who })}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => on.respond(true)}
              className="min-h-tap flex-1 border-rule border-ink bg-red px-4 font-body text-step--1 font-extrabold text-paper disabled:opacity-60"
            >
              {t('market.act.acceptRequest')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => on.respond(false)}
              className="min-h-tap flex-1 border-rule border-ink bg-sheet px-4 font-body text-step--1 font-extrabold text-ink disabled:opacity-60"
            >
              {t('market.act.declineRequest')}
            </button>
          </div>
        </section>
      ) : null}

      {status === 'requested' && thread.connection.role === 'initiator' ? (
        <p className="border-rule border-dashed border-ink/50 bg-paper p-2.5 font-body text-[12.5px] text-ink">{t('market.request.outgoing', { who })}</p>
      ) : null}

      {status === 'declined' || status === 'cancelled' ? (
        <p className="border-rule border-ink bg-sheet p-2.5 font-body text-step--1 font-bold text-ink">{t('market.thread.closed')}</p>
      ) : null}
      {status === 'reported' ? (
        <p className="border-rule border-red bg-sheet p-2.5 font-body text-step--1 font-bold text-red">{t('market.thread.reported')}</p>
      ) : null}

      {tools ? (
        <section aria-label={t('market.act.tools')} className="border-rule border-ink bg-sheet p-2.5">
          <div className="flex flex-wrap gap-2">
            {can.offerPrice ? (
              <ToolButton on={tool === 'price'} onClick={() => setTool(tool === 'price' ? null : 'price')}>
                {t('market.act.offerPrice')}
              </ToolButton>
            ) : null}
            {can.offerTrade ? (
              <ToolButton
                on={tool === 'trade'}
                onClick={() => {
                  if (tool !== 'trade' && tradeItems === null) on.loadTradeItems()
                  setTool(tool === 'trade' ? null : 'trade')
                }}
              >
                {t('market.act.offerTrade')}
              </ToolButton>
            ) : null}
            {can.photoRequest ? (
              <ToolButton on={false} disabled={busy} onClick={on.photoRequest}>
                {t('market.act.photo')}
              </ToolButton>
            ) : null}
          </div>
          {tool === 'price' && can.offerPrice ? (
            <PriceForm
              busy={busy}
              initial={thread.item?.currency ?? 'ILS'}
              onSend={async (amount, currency) => {
                const ok = await on.offerPrice(amount, currency)
                if (ok) setTool(null)
                return ok
              }}
            />
          ) : null}
          {tool === 'trade' && can.offerTrade ? (
            <TradeForm
              busy={busy}
              items={tradeItems}
              shirts={shirts}
              onSend={async (ids) => {
                const ok = await on.offerTrade(ids)
                if (ok) setTool(null)
                return ok
              }}
            />
          ) : null}
        </section>
      ) : null}

      {steps ? (
        <section aria-label={t('market.act.steps')} className="flex flex-col gap-2">
          {can.waiting ? (
            <p role="status" className="border-rule border-dashed border-sign bg-paper p-2.5 font-body text-[12.5px] font-bold text-sign">
              {t('market.act.waiting', { who })}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {can.agreed ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => on.step('agreed')}
                className="min-h-tap flex-1 border-rule border-ink bg-ink px-4 font-body text-step--1 font-extrabold text-paper disabled:opacity-60"
              >
                {t('market.act.agreed')}
              </button>
            ) : null}
            {can.done ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => on.step('done')}
                className="min-h-tap flex-1 border-rule border-ink bg-red px-4 font-body text-step--1 font-extrabold text-paper disabled:opacity-60"
              >
                {t('market.act.done')}
              </button>
            ) : null}
          </div>
          {can.cancel ? (
            confirmCancel ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setConfirmCancel(false)
                    on.step('cancel')
                  }}
                  className="min-h-tap border-rule border-ink bg-sheet px-4 font-body text-step--1 font-extrabold text-ink disabled:opacity-60"
                >
                  {t('market.act.cancelConfirm')}
                </button>
                <button type="button" onClick={() => setConfirmCancel(false)} className="min-h-tap px-2 font-body text-step--1 text-sign underline underline-offset-4">
                  {t('market.dialog.cancel')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmCancel(true)}
                className="min-h-tap self-start px-1 font-body text-[12.5px] font-extrabold text-muted underline underline-offset-4"
              >
                {t('market.act.cancel')}
              </button>
            )
          ) : null}
        </section>
      ) : null}

      {can.compose ? <Composer busy={busy} onSend={on.send} /> : null}
    </div>
  )
}

function ToolButton({ on, disabled, onClick, children }: { on: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-tap border-rule px-3 font-body text-[13px] font-extrabold transition-transform duration-press ease-stamp active:scale-[.97] disabled:opacity-60 motion-reduce:transition-none ${
        on ? 'border-ink bg-ink text-paper' : 'border-ink bg-paper text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function PriceForm({ busy, initial, onSend }: { busy: boolean; initial: Currency; onSend: (amount: number, currency: Currency) => Promise<boolean> }) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>(initial)
  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-2 border-t-hair border-dashed border-ink/50 pt-3"
      onSubmit={(event) => {
        event.preventDefault()
        const value = Number(amount)
        if (!(value > 0) || busy) return
        void onSend(value, currency)
      }}
    >
      <p className="w-full font-display text-step-0 leading-tight text-ink">{t('market.offerForm.title')}</p>
      <label className="min-w-[8rem] flex-1 font-body text-[12px] font-extrabold text-ink">
        {t('market.offerForm.amount')}
        <span className="mt-1 flex items-center border-rule border-ink bg-paper">
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
          <span className="px-2 font-poster text-[20px] text-muted">{currencySymbol(currency)}</span>
        </span>
      </label>
      <label className="font-body text-[12px] font-extrabold text-ink">
        {t('market.offerForm.currency')}
        <select
          value={currency}
          onChange={(event) => setCurrency(event.target.value as Currency)}
          className="mt-1 block min-h-tap border-rule border-ink bg-paper px-2 font-body text-step--1 text-ink"
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {t(CURRENCY[code])}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={busy}
        className="min-h-tap border-rule border-ink bg-red px-4 font-body text-step--1 font-extrabold text-paper disabled:opacity-60"
      >
        {t('market.offerForm.send')}
      </button>
    </form>
  )
}

function TradeForm({
  busy,
  items,
  shirts,
  onSend,
}: {
  busy: boolean
  items: OwnerItem[] | null
  shirts: Readonly<Record<string, CollectorShirt>>
  onSend: (ids: string[]) => Promise<boolean>
}) {
  const [picked, setPicked] = useState<string[]>([])
  const toggle = (id: string) =>
    setPicked((rows) => (rows.includes(id) ? rows.filter((row) => row !== id) : rows.length >= TRADE_MAX ? rows : [...rows, id]))
  return (
    <div className="mt-3 border-t-hair border-dashed border-ink/50 pt-3">
      <p className="font-display text-step-0 leading-tight text-ink">{t('market.tradeForm.title')}</p>
      {items === null ? (
        <p className="mt-2 font-body text-[12.5px] text-muted">{t('market.loading')}</p>
      ) : items.length === 0 ? (
        <p className="mt-2 font-body text-[12.5px] leading-snug text-ink">
          {t('market.tradeForm.none')}{' '}
          <Link href="/kits/closet" className="font-extrabold text-sign underline underline-offset-4">
            {t('market.toCloset')}
          </Link>
        </p>
      ) : (
        <>
          <p className="mt-0.5 font-body text-[12px] text-muted">{t('market.tradeForm.body')}</p>
          <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {items.map((row) => {
              const shirt = shirts[row.archiveSlug]
              const on = picked.includes(row.id)
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(row.id)}
                    className={`block min-h-tap w-full border-rule p-1 text-start ${on ? 'border-red bg-paper' : 'border-ink/40 bg-sheet'}`}
                  >
                    {shirt ? <ArchivePhoto shirt={shirt} /> : null}
                    <span className="mt-0.5 block font-body text-[10.5px] font-bold leading-tight text-ink">
                      {on ? '✓ ' : ''}
                      {shirtName(shirt)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              disabled={busy || picked.length === 0}
              onClick={() => void onSend(picked)}
              className="min-h-tap border-rule border-ink bg-red px-4 font-body text-step--1 font-extrabold text-paper disabled:opacity-50"
            >
              {t('market.tradeForm.send')}
            </button>
            {picked.length > 0 ? <span className="font-body text-[12px] font-bold text-muted">{t('market.tradeForm.picked', { n: String(picked.length) })}</span> : null}
          </div>
        </>
      )}
    </div>
  )
}

function Composer({ busy, onSend }: { busy: boolean; onSend: (body: string) => Promise<boolean> }) {
  const [body, setBody] = useState('')
  return (
    <form
      className="flex items-end gap-2 border-rule border-ink bg-sheet p-2"
      onSubmit={(event) => {
        event.preventDefault()
        const text = body.trim()
        if (!text || busy) return
        void onSend(text).then((ok) => ok && setBody(''))
      }}
    >
      <label className="min-w-0 flex-1">
        <span className="sr-only">{t('market.compose.label')}</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={1000}
          rows={2}
          placeholder={t('market.compose.placeholder')}
          className="block min-h-tap w-full resize-y border-hair border-ink/40 bg-paper p-2 font-body text-step--1 text-ink placeholder:text-muted"
        />
      </label>
      <button
        type="submit"
        disabled={busy || body.trim() === ''}
        className="min-h-tap shrink-0 border-rule border-ink bg-ink px-4 font-body text-step--1 font-extrabold text-paper disabled:opacity-50"
      >
        {t('market.compose.send')}
      </button>
    </form>
  )
}
