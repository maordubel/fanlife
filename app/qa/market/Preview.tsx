'use client'

import Link from 'next/link'
import { useState } from 'react'

import { MerchantOffersView } from '@/components/collector/MerchantOffers'
import { SignInPrompt } from '@/components/collector/SignInPrompt'
import { ListingView, type Viewer } from '@/components/market/ListingView'
import { MarketBoard, type TableState } from '@/components/market/MarketBoard'
import { MarketSignIn } from '@/components/market/MarketSignIn'
import type { MatchesState } from '@/components/market/MatchesPanel'
import { ThreadView, type ThreadHandlers } from '@/components/market/ThreadView'
import type { CollectorShirt, OwnerItem, Thread } from '@/lib/collector/types'

import { ITEMS, MATCHES, MY_TRADES, OFFERS, SIGNAL, THREAD_DONE, THREAD_REQUEST, THREAD_TALK, THREAD_WAITING } from './fixtures'
import { VIEWS, type View } from './views'

const later = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 250))

/** the harness's own nav — QA only, never on a real screen */
function Nav({ view }: { view: View }) {
  return (
    <nav aria-label="QA" className="mt-stack border-t-rule border-ink pt-3">
      <ul className="flex flex-wrap gap-1.5">
        {VIEWS.map((key) => (
          <li key={key}>
            <Link
              href={`/qa/market?show=${key}`}
              className={`inline-flex min-h-tap items-center border-hair px-2 font-body text-[11px] font-bold ${key === view ? 'border-ink bg-ink text-paper' : 'border-ink/40 text-ink'}`}
            >
              {key}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function Preview({ view, shirts }: { view: View; shirts: Record<string, CollectorShirt> }) {
  return (
    <>
      <Body view={view} shirts={shirts} />
      <Nav view={view} />
    </>
  )
}

function Body({ view, shirts }: { view: View; shirts: Record<string, CollectorShirt> }) {
  if (view.startsWith('board')) return <Board view={view} shirts={shirts} />
  if (view.startsWith('listing')) return <Listing view={view} shirts={shirts} />
  if (view === 'shops') return <MerchantOffersView offers={OFFERS} />
  const thread = view === 'thread-request' ? THREAD_REQUEST : view === 'thread-waiting' ? THREAD_WAITING : view === 'thread-done' ? THREAD_DONE : THREAD_TALK
  return <ThreadPreview initial={thread} shirts={shirts} />
}

function Board({ view, shirts }: { view: View; shirts: Record<string, CollectorShirt> }) {
  const [slug, setSlug] = useState<string | null>(view === 'board-slug' ? 'vp-1999-home' : null)
  const table: TableState =
    view === 'board-off' ? { state: 'off' } : view === 'board-empty' ? { state: 'ready', items: [], more: false } : { state: 'ready', items: slug ? ITEMS.filter((row) => row.archiveSlug === slug) : ITEMS, more: view === 'board' }
  const matches: MatchesState =
    view === 'board-off'
      ? { state: 'off' }
      : view === 'board-guest'
        ? { state: 'guest' }
        : view === 'board-empty'
          ? { state: 'ready', data: { perfectSwaps: [], wanted: [], wantedByOthers: [], auctions: [] } }
          : { state: 'ready', data: MATCHES }
  return <MarketBoard shirts={shirts} table={table} matches={matches} slug={slug} onSlug={setSlug} onMore={() => undefined} signIn={<MarketSignIn next="/kits/market" />} />
}

function Listing({ view, shirts }: { view: View; shirts: Record<string, CollectorShirt> }) {
  const item = view === 'listing-own' ? ITEMS[5]! : view === 'listing-archive' ? ITEMS[2]! : view === 'listing-guest' ? ITEMS[1]! : ITEMS[0]!
  const viewer: Viewer = view === 'listing-guest' ? 'guest' : 'member'
  const [busy, setBusy] = useState(false)
  return (
    <ListingView
      item={item}
      shirt={shirts[item.archiveSlug] ?? null}
      signal={SIGNAL}
      viewer={viewer}
      connectionId={null}
      connect={{ busy, error: null }}
      onConnect={() => {
        setBusy(true)
        void later(null).then(() => setBusy(false))
      }}
      signIn={<SignInPrompt next="/kits/market" />}
      shops={<MerchantOffersView offers={OFFERS} />}
    />
  )
}

/** A conversation that answers its own buttons, so a step can be walked through in the browser. */
function ThreadPreview({ initial, shirts }: { initial: Thread; shirts: Record<string, CollectorShirt> }) {
  const [thread, setThread] = useState(initial)
  const [trades, setTrades] = useState<OwnerItem[] | null>(null)
  const [busy, setBusy] = useState(false)
  const touch = async (change: (now: Thread) => Thread) => {
    setBusy(true)
    await later(null)
    setThread(change)
    setBusy(false)
    return true
  }
  const status = (next: Thread['connection']['status'], extra: Partial<Thread['connection']> = {}) => (now: Thread) => ({
    ...now,
    connection: { ...now.connection, status: next, ...extra },
  })
  const on: ThreadHandlers = {
    respond: (accept) => void touch(status(accept ? 'accepted' : 'declined')),
    send: (body) =>
      touch((now) => ({
        ...now,
        messages: [...now.messages, { id: `x${now.messages.length}`, kind: 'text', from: now.connection.role === 'recipient' ? 'recipient' : 'initiator', body, meta: null, createdAt: new Date().toISOString() }],
      })),
    photoRequest: () => undefined,
    offerPrice: () => later(true),
    offerTrade: () => later(true),
    answer: (_offer, action) => void touch(status(action === 'accept' ? 'agreed' : thread.connection.status)),
    counter: () => later(true),
    step: (which) => void touch(status(which === 'cancel' ? 'cancelled' : which === 'agreed' ? 'agreed' : 'completed', which === 'done' ? { myDone: true, theirDone: true } : {})),
    loadTradeItems: () => void later(MY_TRADES).then(setTrades),
    addToCloset: () => later(true),
  }
  return <ThreadView thread={thread} shirts={shirts} tradeItems={trades} busy={busy} error={null} on={on} />
}
