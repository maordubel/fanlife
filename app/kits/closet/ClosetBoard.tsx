'use client'

import { useEffect, useMemo, useState } from 'react'

import { CollectorTag } from '@/components/collector/CollectorTag'
import { ItemFacts } from '@/components/collector/ItemFacts'
import { NotificationList } from '@/components/collector/NotificationList'
import { ShirtThumb } from '@/components/collector/ShirtThumb'
import { ShareRow } from '@/components/share/ShareRow'
import { Num } from '@/components/ui/Num'
import { useDialog } from '@/components/ui/useDialog'
import { closetCard, decadeShort, isolate, shirtDateText, wantedCard } from '@/lib/collector/cards'
import { errorLabel, handleLabel } from '@/lib/collector/labels'
import { closetSummary, IN_CLOSET } from '@/lib/collector/metrics'
import type {
  Closet,
  CollectorError,
  CollectorNotification,
  CollectorShirt,
  ConnectionStatus,
  ConnectionSummary,
  ItemState,
  OwnerItem,
} from '@/lib/collector/types'
import { t, type MessageKey } from '@/lib/i18n'

import type { ClosetApi } from './api'
import { ClosetMetrics } from './ClosetMetrics'
import { ItemEditor } from './ItemEditor'
import { closetPath, PrivacyPanel } from './PrivacyPanel'

/**
 * לוח הארון — הכותרת, ארבע הלשוניות, המדדים, השיתוף והפרטיות (מפרט §10–§11, §19–§20, §45–§48).
 *
 * בטלפון עמודה אחת: המספרים, הלשוניות, ואז מה שהארון אומר. מ-1024 פיקסלים זה לוח בשתי עמודות —
 * הרשימה ברוחב שלה, והמדדים, השיתוף והפרטיות בעמודה שנשארת במקום בזמן שגוללים — ולא טלפון מתוח.
 *
 * הלוח לא יודע מי עונה לו (`ClosetApi`): בייצור זה המסד, במתקן הבדיקה אלה תשובות מקומיות.
 */
export type Tab = 'have' | 'want' | 'open' | 'connections'
type Connections = ConnectionSummary[] | 'loading' | { error: CollectorError }
type Notices = { unread: number; items: CollectorNotification[] } | 'loading' | { error: CollectorError } | null

const STATE: Record<ItemState, MessageKey> = {
  held: 'collector.state.held',
  reserved: 'collector.state.reserved',
  sold: 'collector.state.sold',
  traded: 'collector.state.traded',
  removed: 'collector.state.removed',
  suspended: 'collector.state.suspended',
}
const STATUS: Record<ConnectionStatus, MessageKey> = {
  requested: 'collector.conn.status.requested',
  accepted: 'collector.conn.status.accepted',
  negotiating: 'collector.conn.status.negotiating',
  agreed: 'collector.conn.status.agreed',
  completed: 'collector.conn.status.completed',
  declined: 'collector.conn.status.declined',
  cancelled: 'collector.conn.status.cancelled',
  reported: 'collector.conn.status.reported',
}
const TABS: { id: Tab; label: MessageKey }[] = [
  { id: 'have', label: 'collector.tab.have' },
  { id: 'want', label: 'collector.tab.want' },
  { id: 'open', label: 'collector.tab.open' },
  { id: 'connections', label: 'collector.tab.connections' },
]

export function ClosetBoard({
  closet: initial,
  shirts,
  archive,
  api,
  initialEdit = null,
  initialTab = 'have',
  initialNotices = false,
  flash = null,
  now,
}: {
  closet: Closet
  shirts: Readonly<Record<string, CollectorShirt>>
  archive: readonly CollectorShirt[]
  api: ClosetApi
  /** an item id to open on arrival — `?shirt=` from the archive's "✓ בארון שלך" */
  initialEdit?: string | null
  initialTab?: Tab
  /** open the notifications on arrival (the QA harness photographs them) */
  initialNotices?: boolean
  /** one line to print on arrival — the pending marks that were just saved */
  flash?: string | null
  now?: number
}) {
  const [closet, setCloset] = useState<Closet>(initial)
  const [tab, setTab] = useState<Tab>(initialTab)
  const [editing, setEditing] = useState<string | null>(initialEdit)
  const [connections, setConnections] = useState<Connections>('loading')
  const [notices, setNotices] = useState<Notices>(null)
  const [noticesOpen, setNoticesOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(flash)

  useEffect(() => {
    let live = true
    void api.connections().then((out) => {
      if (live) setConnections(out.ok ? out.connections : { error: out.error })
    })
    return () => {
      live = false
    }
  }, [api])

  const items = closet.items
  const held = useMemo(() => items.filter((item) => IN_CLOSET.has(item.state)), [items])
  const gone = useMemo(() => items.filter((item) => !IN_CLOSET.has(item.state) && item.state !== 'removed'), [items])
  const open = useMemo(() => held.filter((item) => item.state === 'held' && (item.forSale || item.forTrade)), [held])
  const summary = useMemo(() => closetSummary(items, closet.wants.length, shirts), [items, closet.wants.length, shirts])
  const copyIndex = useMemo(() => copyNumbers(items), [items])
  const current = editing ? (items.find((item) => item.id === editing) ?? null) : null
  const sharePath = closetPath(closet.profile) ?? '/kits/closet'
  const unread = notices && typeof notices === 'object' && 'unread' in notices ? notices.unread : closet.unread

  function replace(next: OwnerItem) {
    setCloset((state) => ({ ...state, items: state.items.map((item) => (item.id === next.id ? next : item)) }))
  }

  async function openNotices() {
    setNoticesOpen(true)
    setNotices('loading')
    const out = await api.notifications(50)
    if (!out.ok) {
      setNotices({ error: out.error })
      return
    }
    setNotices({ unread: out.unread, items: out.items })
  }

  async function readAll() {
    const out = await api.notificationsRead()
    if (!out.ok) return
    setNotices((state) => (state && typeof state === 'object' && 'items' in state ? { unread: 0, items: state.items.map((note) => ({ ...note, read: true })) } : state))
    setCloset((state) => ({ ...state, unread: 0 }))
  }

  async function unwant(slug: string) {
    const out = await api.wantSet(slug, false)
    if (!out.ok) {
      setMessage(errorLabel(out.error))
      return
    }
    setCloset((state) => ({ ...state, wants: state.wants.filter((want) => want.archiveSlug !== slug) }))
    setMessage(t('collector.want.removed'))
  }

  // open the notifications the harness asks for, after the first paint
  useEffect(() => {
    if (initialNotices) void openNotices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const counts: Record<Tab, number | null> = {
    have: held.length,
    want: closet.wants.length,
    open: open.length,
    connections: Array.isArray(connections) ? connections.length : null,
  }

  return (
    <div data-closet-board="" className="mt-stack">
      {/* ── the header strip: who, the bell, the way back to the archive ── */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-y-rule border-ink py-2">
        <div className="min-w-0">
          <CollectorTag label={closet.label} />
          <p className="font-body text-[11px] text-muted">
            {t('collector.privacy.title')}
            {': '}
            <span className="font-extrabold text-ink">
              {t(closet.profile.visibility === 'public' ? 'collector.privacy.public' : closet.profile.visibility === 'link_only' ? 'collector.privacy.link_only' : 'collector.privacy.private')}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/kits/archive" className="inline-flex min-h-tap items-center px-2 font-body text-step--1 font-extrabold text-sign underline underline-offset-4">
            {t('collector.closet.archive')}
          </a>
          <button
            type="button"
            onClick={() => void openNotices()}
            aria-label={unread > 0 ? t('collector.notify.open', { n: String(unread) }) : t('collector.notify.openNone')}
            data-closet-bell=""
            className="relative inline-flex min-h-tap items-center gap-2 border-rule border-ink bg-sheet px-3 font-body text-step--1 font-extrabold text-ink"
          >
            {t('collector.closet.notifications')}
            {unread > 0 ? (
              <span className="inline-flex min-w-[24px] items-center justify-center bg-red px-1.5 font-poster text-[17px] leading-[24px] text-paper">
                <Num>{String(unread)}</Num>
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {message ? (
        <p role="status" className="mt-2 border-s-plate border-sign bg-sheet py-2 pe-2 ps-3 font-body text-step--1 font-bold text-ink">
          {message}
        </p>
      ) : null}

      {/* ── the numbers (§10) ── */}
      <StatBoard summary={summary} />

      <div className="mt-stack lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-start lg:gap-6">
        {/* ── the tabs ── */}
        <div className="min-w-0">
          <div role="tablist" aria-label={t('collector.tab.aria')} className="grid grid-cols-4 border-b-plate border-ink">
            {TABS.map((row) => {
              const on = tab === row.id
              return (
                <button
                  key={row.id}
                  type="button"
                  role="tab"
                  id={`tab-${row.id}`}
                  aria-selected={on}
                  aria-controls={`panel-${row.id}`}
                  onClick={() => setTab(row.id)}
                  className={`flex min-h-tap flex-col items-center justify-center gap-0.5 px-1 py-1 font-body text-[12.5px] font-extrabold leading-none sm:flex-row sm:gap-1.5 sm:text-step--1 ${
                    on ? 'bg-ink text-paper' : 'bg-paper text-ink'
                  }`}
                >
                  <span className="truncate">{t(row.label)}</span>
                  {counts[row.id] !== null ? (
                    <span className={`font-poster text-[17px] leading-none ${on ? 'text-red' : 'text-muted'}`}>
                      <Num>{String(counts[row.id])}</Num>
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="pt-3">
            {tab === 'have' ? (
              held.length === 0 ? (
                <Empty title="collector.have.empty.title" body="collector.have.empty.body" />
              ) : (
                <>
                  <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {held.map((item) => (
                      <li key={item.id}>
                        <HaveCard item={item} shirt={shirts[item.archiveSlug]} copy={copyIndex[item.id] ?? null} onOpen={() => setEditing(item.id)} />
                      </li>
                    ))}
                  </ul>
                  {gone.length > 0 ? (
                    <div className="mt-stack">
                      <p className="border-b-hair border-ink/30 pb-1 font-body text-[11px] font-extrabold tracking-wide text-muted">{t('collector.item.left')}</p>
                      <ul className="mt-1">
                        {gone.map((item) => (
                          <li key={item.id} className="flex items-center gap-2.5 border-b-hair border-ink/15 py-1.5">
                            <div className="w-10 shrink-0 opacity-70">
                              <ShirtThumb shirt={shirts[item.archiveSlug]} />
                            </div>
                            <span className="min-w-0 flex-1 truncate font-body text-step--1 text-ink">
                              <ShirtLine shirt={shirts[item.archiveSlug]} slug={item.archiveSlug} />
                            </span>
                            <span className="font-body text-[11px] font-extrabold text-muted">{t(STATE[item.state])}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              )
            ) : null}

            {tab === 'want' ? (
              closet.wants.length === 0 ? (
                <Empty title="collector.want.empty.title" body="collector.want.empty.body" />
              ) : (
                <ul className="border-t-rule border-ink">
                  {closet.wants.map((want) => (
                    <WantRow key={want.id} slug={want.archiveSlug} available={want.available} shirt={shirts[want.archiveSlug]} onRemove={() => void unwant(want.archiveSlug)} />
                  ))}
                </ul>
              )
            ) : null}

            {tab === 'open' ? (
              open.length === 0 ? (
                <Empty title="collector.open.empty.title" body="collector.open.empty.body" />
              ) : (
                <ul className="border-t-rule border-ink">
                  {open.map((item) => (
                    <li key={item.id} className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 border-b-hair border-ink/25 py-2.5 sm:grid-cols-[88px_minmax(0,1fr)]">
                      <button type="button" onClick={() => setEditing(item.id)} aria-label={t('collector.item.open', { shirt: shirtText(shirts[item.archiveSlug], item.archiveSlug) })} className="block min-h-tap">
                        <ShirtThumb shirt={shirts[item.archiveSlug]} />
                      </button>
                      <div className="min-w-0">
                        <p className="font-poster text-[20px] leading-none text-ink">
                          <ShirtLine shirt={shirts[item.archiveSlug]} slug={item.archiveSlug} />
                        </p>
                        <div className="mt-1">
                          <ItemFacts item={item} />
                        </div>
                        <p className="mt-1 flex flex-wrap gap-x-3 font-body text-[12px] text-muted">
                          {item.forTrade ? <span className="font-extrabold text-sign">{t('collector.editor.trade')}</span> : null}
                          {item.wanters > 0 ? <span>{item.wanters === 1 ? t('collector.item.wantersOne') : t('collector.item.wanters', { n: String(item.wanters) })}</span> : null}
                          {item.openConnections > 0 ? <span>{t('collector.item.connections', { n: String(item.openConnections) })}</span> : null}
                          {item.lot ? <span className="font-extrabold text-red">{t('collector.item.lot')}</span> : null}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-4">
                          <a href={`/kits/market/item/${item.id}`} className="inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-sign underline underline-offset-4">
                            {t('collector.open.view')}
                          </a>
                          <button type="button" onClick={() => setEditing(item.id)} className="min-h-tap font-body text-step--1 font-extrabold text-ink underline underline-offset-4">
                            {t('collector.item.edit')}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            ) : null}

            {tab === 'connections' ? <ConnectionList connections={connections} shirts={shirts} /> : null}
          </div>
        </div>

        {/* ── the side column: what the closet says, the share, the privacy ── */}
        <aside className="mt-stack space-y-4 lg:sticky lg:top-4 lg:mt-0">
          <ClosetMetrics items={items} shirts={shirts} archive={archive} shareRoute={sharePath} />
          <ClosetShare closet={closet} held={held} shirts={shirts} summary={summary} route={sharePath} />
          <PrivacyPanel closet={closet} api={api} onChange={(profile) => setCloset((state) => ({ ...state, profile }))} />
        </aside>
      </div>

      {current ? (
        <ItemEditor
          key={current.id}
          item={current}
          shirt={shirts[current.archiveSlug]}
          copyIndex={copyIndex[current.id] ?? null}
          api={api}
          onSaved={replace}
          onRemoved={(id) => {
            setCloset((state) => ({ ...state, items: state.items.filter((item) => item.id !== id) }))
            setEditing(null)
            setMessage(t('collector.editor.removed'))
          }}
          onCopy={(item) => setCloset((state) => ({ ...state, items: [item, ...state.items] }))}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {noticesOpen ? <NoticesSheet notices={notices} shirts={shirts} now={now} onReadAll={() => void readAll()} onClose={() => setNoticesOpen(false)} /> : null}
    </div>
  )
}

/** `{ itemId: 2 }` for the second copy of the same shirt — the oldest copy is 1 */
function copyNumbers(items: readonly OwnerItem[]): Record<string, number> {
  const bySlug = new Map<string, OwnerItem[]>()
  for (const item of items) {
    if (!IN_CLOSET.has(item.state)) continue
    bySlug.set(item.archiveSlug, [...(bySlug.get(item.archiveSlug) ?? []), item])
  }
  const out: Record<string, number> = {}
  for (const rows of bySlug.values()) {
    if (rows.length < 2) continue
    ;[...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).forEach((item, index) => {
      out[item.id] = index + 1
    })
  }
  return out
}

function shirtText(shirt: CollectorShirt | undefined, slug: string): string {
  return shirt ? `${shirt.variantHe} · ${shirtDateText(shirt)}` : slug
}

/** the date as a figure (isolated) and the variant as a word, never one forced run (rule 69 §7) */
function ShirtLine({ shirt, slug }: { shirt: CollectorShirt | undefined; slug: string }) {
  if (!shirt) return <bdi>{slug}</bdi>
  return (
    <>
      {!shirt.seasonAmbiguous && shirt.seasonLabel ? (
        <Num>{shirt.seasonLabel}</Num>
      ) : (
        <>
          <Num>{String(shirt.yearRaw ?? shirt.year)}</Num> {t('kits.archive.approx')}
        </>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ the numbers */
function StatBoard({ summary }: { summary: ReturnType<typeof closetSummary> }) {
  const cells: { n: number; label: string; tone: 'red' | 'ink' | 'sign' }[] = [
    { n: summary.copies, label: t(summary.copies === 1 ? 'collector.stat.copiesOne' : 'collector.stat.copies'), tone: 'red' },
    ...(summary.topDecade ? [{ n: summary.topDecade.copies, label: t('collector.stat.decade', { d: decadeShort(summary.topDecade.decade) }), tone: 'ink' as const }] : []),
    { n: summary.forTrade, label: t(summary.forTrade === 1 ? 'collector.stat.tradeOne' : 'collector.stat.trade'), tone: 'sign' },
    { n: summary.forSale, label: t(summary.forSale === 1 ? 'collector.stat.saleOne' : 'collector.stat.sale'), tone: 'ink' },
    { n: summary.wants, label: t('collector.stat.wants'), tone: 'ink' },
  ]
  return (
    <dl data-closet-stats="" className="mt-3 grid grid-cols-2 border-plate border-ink bg-sheet sm:flex">
      {cells.map((cell, index) => (
        <div
          key={cell.label}
          className={`flex flex-col-reverse justify-end gap-1 border-ink/30 px-3 py-2.5 sm:flex-1 ${
            index === 0 ? 'col-span-2 bg-red text-paper' : 'border-t-hair sm:border-s-hair sm:border-t-0'
          } ${index > 0 && index % 2 === 0 ? 'border-s-hair' : ''}`}
        >
          <dt className={`font-body text-[12px] font-extrabold leading-tight ${index === 0 ? 'text-paper' : 'text-muted'}`}>{cell.label}</dt>
          <dd className="relative font-poster text-[46px] leading-none sm:text-[54px]">
            {index === 0 ? (
              <>
                <span aria-hidden="true" className="plate-shift absolute inset-0 text-sign">
                  <Num>{String(cell.n)}</Num>
                </span>
                <span className="plate-top relative text-paper">
                  <Num>{String(cell.n)}</Num>
                </span>
              </>
            ) : (
              <span className={cell.tone === 'sign' ? 'text-sign' : 'text-ink'}>
                <Num>{String(cell.n)}</Num>
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/* ------------------------------------------------------------------ one hanger */
function HaveCard({ item, shirt, copy, onOpen }: { item: OwnerItem; shirt: CollectorShirt | undefined; copy: number | null; onOpen: () => void }) {
  const blank = item.size === null && item.condition === null && item.itemType === 'unknown' && item.photos.length === 0
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t('collector.item.open', { shirt: shirtText(shirt, item.archiveSlug) })}
      data-closet-item=""
      className="flex min-h-tap w-full flex-col border-rule border-ink/70 bg-sheet p-2 text-start transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
    >
      <span className="relative block">
        <ShirtThumb shirt={shirt} />
        {item.forSale || item.forTrade ? (
          <span className="absolute start-0 top-0 flex gap-px">
            {item.forTrade ? <span className="bg-sign px-1.5 py-0.5 font-body text-[11px] font-extrabold text-paper">⇄</span> : null}
            {item.forSale ? <span className="bg-red px-1.5 py-0.5 font-body text-[11px] font-extrabold text-paper">₪</span> : null}
          </span>
        ) : null}
        {item.state !== 'held' ? (
          <span className="absolute bottom-1 end-1 -rotate-6 border-rule border-red bg-paper px-1.5 font-body text-[11px] font-extrabold text-red">{t(STATE[item.state])}</span>
        ) : null}
      </span>
      <span className="mt-2 block font-poster text-[18px] leading-none text-ink">
        <ShirtLine shirt={shirt} slug={item.archiveSlug} />
      </span>
      <span className="mt-1 block truncate font-body text-[11px] font-extrabold text-red">
        {shirt?.variantHe ?? ''}
        {copy ? ` · ${t('collector.item.copyN', { n: String(copy) })}` : ''}
      </span>
      <span className="mt-0.5 block truncate font-body text-[11px] text-muted">
        {item.wanters > 0
          ? item.wanters === 1
            ? t('collector.item.wantersOne')
            : t('collector.item.wanters', { n: String(item.wanters) })
          : blank
            ? t('collector.item.edit')
            : ' '}
      </span>
    </button>
  )
}

/* ------------------------------------------------------------------ one want */
function WantRow({ slug, available, shirt, onRemove }: { slug: string; available: number; shirt: CollectorShirt | undefined; onRemove: () => void }) {
  const [sharing, setSharing] = useState(false)
  const date = shirt ? shirtDateText(shirt) : slug
  return (
    <li className="border-b-hair border-ink/25 py-2.5">
      <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 sm:grid-cols-[88px_minmax(0,1fr)]">
        <a href={`/kits/archive?shirt=${encodeURIComponent(slug)}`} className="block" aria-label={shirtText(shirt, slug)}>
          <ShirtThumb shirt={shirt} />
        </a>
        <div className="min-w-0">
          <p className="font-poster text-[20px] leading-none text-ink">
            <ShirtLine shirt={shirt} slug={slug} />
          </p>
          <p className="mt-0.5 font-body text-[11px] font-extrabold text-red">{shirt?.variantHe ?? ''}</p>
          {available > 0 ? (
            <a href={`/kits/market?slug=${encodeURIComponent(slug)}`} className="mt-0.5 inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-sign underline underline-offset-4">
              {available === 1 ? t('collector.want.availableOne') : t('collector.want.available', { n: String(available) })}
            </a>
          ) : (
            <p className="mt-1 font-body text-[12px] text-muted">{t('collector.want.none')}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-x-4">
            <button type="button" onClick={() => setSharing((open) => !open)} aria-expanded={sharing} className="min-h-tap font-body text-step--1 font-extrabold text-ink underline underline-offset-4">
              {t('collector.share.wanted')}
            </button>
            <button type="button" onClick={onRemove} className="min-h-tap font-body text-step--1 font-extrabold text-muted underline underline-offset-4">
              {t('collector.want.remove')}
            </button>
          </div>
        </div>
      </div>
      {sharing ? (
        <ShareRow
          kind="wanted"
          params={{}}
          headline={isolate(date)}
          route={`/kits/archive?shirt=${encodeURIComponent(slug)}`}
          card={wantedCard(date, shirt && shirt.variant !== 'home' ? shirt.variantHe : null)}
        />
      ) : null}
    </li>
  )
}

/* ------------------------------------------------------------------ connections */
function ConnectionList({ connections, shirts }: { connections: Connections; shirts: Readonly<Record<string, CollectorShirt>> }) {
  if (connections === 'loading') return <p className="font-body text-step--1 text-muted">{t('collector.closet.loading')}</p>
  if (!Array.isArray(connections)) return <p className="font-body text-step--1 text-muted">{t('collector.conn.error')} {errorLabel(connections.error)}</p>
  if (connections.length === 0) return <Empty title="collector.conn.empty.title" body="collector.conn.empty.body" />
  return (
    <ul className="border-t-rule border-ink">
      {connections.map((row) => {
        const shirt = row.item ? shirts[row.item.archiveSlug] : undefined
        return (
          <li key={row.id} className="border-b-hair border-ink/25">
            <a href={`/kits/market/c/${row.id}`} className="grid min-h-tap grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 hover:bg-sheet">
              <span className="block">{row.item ? <ShirtThumb shirt={shirt} /> : null}</span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-body text-step--1 font-extrabold text-ink">{t(row.kind === 'trade' ? 'collector.conn.kind.trade' : 'collector.conn.kind.buy')}</span>
                  <span className="font-body text-[11px] text-muted">{t(row.role === 'initiator' ? 'collector.conn.initiator' : 'collector.conn.recipient')}</span>
                </span>
                <span className="block truncate font-body text-[12px] text-ink">
                  {row.item ? <ShirtLine shirt={shirt} slug={row.item.archiveSlug} /> : t('collector.conn.noItem')}
                </span>
                <span className="block">
                  <CollectorTag label={row.counterpart} compact />
                </span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <span className={`border-rule px-1.5 font-body text-[11px] font-extrabold ${row.status === 'completed' ? 'border-red text-red' : 'border-ink/40 text-ink'}`}>{t(STATUS[row.status])}</span>
                {row.unread ? <span className="bg-red px-1.5 font-body text-[10.5px] font-extrabold text-paper">{t('collector.conn.unread')}</span> : null}
              </span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}

/* ------------------------------------------------------------------ share the closet */
function ClosetShare({
  closet,
  held,
  shirts,
  summary,
  route,
}: {
  closet: Closet
  held: readonly OwnerItem[]
  shirts: Readonly<Record<string, CollectorShirt>>
  summary: ReturnType<typeof closetSummary>
  route: string
}) {
  const [keeper, setKeeper] = useState<string>('')
  const [sharing, setSharing] = useState(false)
  const options = useMemo(() => {
    const seen = new Set<string>()
    return held.filter((item) => (seen.has(item.archiveSlug) ? false : (seen.add(item.archiveSlug), true)))
  }, [held])
  const chosen = keeper ? shirts[keeper] : undefined
  const keeperText = chosen ? `${shirtDateText(chosen)} · ${chosen.variantHe}` : null
  const name = handleLabel(closet.label)
  return (
    <section aria-labelledby="share-title" className="border-plate border-ink bg-sheet">
      <h2 id="share-title" className="bg-ink px-3 py-2 font-display text-step-1 leading-none text-paper">
        {t('collector.share.title')}
      </h2>
      <div className="p-3">
        {summary.copies === 0 ? (
          <p className="font-body text-step--1 text-muted">{t('collector.share.emptyNote')}</p>
        ) : (
          <>
            <label className="block">
              <span className="font-body text-step--1 font-extrabold text-ink">{t('collector.share.keeper')}</span>
              <select
                value={keeper}
                onChange={(event) => setKeeper(event.target.value)}
                className="mt-1 block min-h-tap w-full border-rule border-ink bg-paper px-2 font-body text-step--1 text-ink"
              >
                <option value="">{t('collector.share.keeperNone')}</option>
                {options.map((item) => (
                  <option key={item.archiveSlug} value={item.archiveSlug}>
                    {shirtText(shirts[item.archiveSlug], item.archiveSlug)}
                  </option>
                ))}
              </select>
            </label>
            {closet.profile.visibility === 'private' ? <p className="mt-2 font-body text-[11.5px] leading-snug text-muted">{t('collector.share.privateNote')}</p> : null}
            <button
              type="button"
              onClick={() => setSharing((open) => !open)}
              aria-expanded={sharing}
              className="mt-2 flex min-h-tap w-full items-center justify-between border-rule border-ink bg-paper px-3 font-body text-step--1 font-extrabold text-ink"
            >
              <span>{t('collector.share.closet')}</span>
              <span aria-hidden="true" className="font-poster text-[20px] leading-none text-red">
                {sharing ? '−' : '+'}
              </span>
            </button>
            {sharing ? (
              <ShareRow
                kind="closet"
                params={{}}
                headline={t('collector.card.closet.title', { name })}
                route={route}
                card={closetCard({ name, copies: summary.copies, span: summary.span, keeper: keeperText })}
              />
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ the bell */
function NoticesSheet({
  notices,
  shirts,
  now,
  onReadAll,
  onClose,
}: {
  notices: Notices
  shirts: Readonly<Record<string, CollectorShirt>>
  now?: number
  onReadAll: () => void
  onClose: () => void
}) {
  const ref = useDialog<HTMLDivElement>(onClose)
  const ready = notices && typeof notices === 'object' && 'items' in notices ? notices : null
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notices-title"
      tabIndex={-1}
      data-closet-notices=""
      className="fixed inset-0 z-[60] flex items-end justify-end bg-ink/50 lg:items-stretch"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[88dvh] w-full flex-col border-t-plate border-red bg-paper lg:h-full lg:max-h-none lg:max-w-[440px] lg:border-s-plate lg:border-t-0 lg:border-ink"
      >
        <header className="flex items-center justify-between gap-2 border-b-rule border-ink bg-sheet px-3 py-2">
          <h2 id="notices-title" className="font-display text-step-2 leading-none text-ink">
            {t('collector.notify.title')}
          </h2>
          <div className="flex items-center gap-1">
            {ready && ready.unread > 0 ? (
              <button type="button" onClick={onReadAll} className="min-h-tap px-2 font-body text-[12px] font-extrabold text-sign underline underline-offset-4">
                {t('collector.notify.readAll')}
              </button>
            ) : null}
            <button type="button" onClick={onClose} aria-label={t('collector.notify.close')} className="flex min-h-tap min-w-tap items-center justify-center font-body text-[22px] font-black text-ink">
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
          {notices === 'loading' || notices === null ? (
            <p className="font-body text-step--1 text-muted">{t('collector.closet.loading')}</p>
          ) : ready ? (
            <NotificationList items={ready.items} shirts={shirts} now={now} />
          ) : (
            <p role="alert" className="font-body text-step--1 text-muted">
              {t('collector.notify.error')} {errorLabel((notices as { error: CollectorError }).error)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Empty({ title, body }: { title: MessageKey; body: MessageKey }) {
  return (
    <div className="border-rule border-dashed border-ink/50 bg-sheet p-4">
      <p className="font-display text-step-1 leading-tight text-ink">{t(title)}</p>
      <p className="mt-1 max-w-prose font-body text-step--1 leading-relaxed text-muted">{t(body)}</p>
      <a href="/kits/archive" className="mt-2 inline-flex min-h-tap items-center bg-ink px-4 font-body text-step--1 font-extrabold text-paper">
        {t('collector.closet.archive')}
      </a>
    </div>
  )
}
