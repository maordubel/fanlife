'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { SignInPrompt } from '@/components/collector/SignInPrompt'
import { ThreadView, type ThreadHandlers } from '@/components/market/ThreadView'
import { EmptyState } from '@/components/ui/EmptyState'
import { closetMine, have, offerMake, offerRespond, respond, sendMessage, step, thread as readThread } from '@/lib/collector/api'
import { errorLabel } from '@/lib/collector/labels'
import type { CollectorError, CollectorShirt, Currency, OwnerItem, Result, Thread } from '@/lib/collector/types'
import { t } from '@/lib/i18n'
import { portalConfigured } from '@/lib/portal/env'

/** How often an open conversation asks for news. Realtime needs a change to the publication shared with DUBID (docs/17 §5). */
const POLL_MS = 10_000

type Load =
  | { state: 'loading' }
  | { state: 'off' }
  | { state: 'guest' }
  | { state: 'gone' }
  | { state: 'error'; message: string }
  | { state: 'ready'; thread: Thread }

const settled = (status: Thread['connection']['status']) =>
  status === 'completed' || status === 'declined' || status === 'cancelled' || status === 'reported'

/**
 * The conversation's client half. `thread(id)` on open and every ten seconds while the tab is
 * visible — paused when it is hidden, and read again the moment it comes back — and after every
 * action, so both sides see a step the moment the database takes it.
 */
export function ThreadScreen({ id, shirts }: { id: string; shirts: Record<string, CollectorShirt> }) {
  const router = useRouter()
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tradeItems, setTradeItems] = useState<OwnerItem[] | null>(null)
  const live = useRef(true)
  /** a settled conversation (completed, declined, cancelled, reported) has no news to poll for */
  const quiet = useRef(false)

  const refresh = useCallback(async () => {
    const out = await readThread(id)
    if (!live.current) return
    if (out.ok) {
      quiet.current = settled(out.connection.status)
      setLoad({ state: 'ready', thread: out })
      return
    }
    // a poll that fails after the conversation loaded keeps what is on screen
    setLoad((now) => {
      if (now.state === 'ready' && out.error === 'network') return now
      if (out.error === 'off') return { state: 'off' }
      if (out.error === 'auth_required') return { state: 'guest' }
      if (out.error === 'not_found') return { state: 'gone' }
      return { state: 'error', message: errorLabel(out.error) }
    })
  }, [id])

  useEffect(() => {
    live.current = true
    if (!portalConfigured()) {
      setLoad({ state: 'off' })
      return
    }
    void refresh()
    let timer: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (timer === null) timer = setInterval(() => {
          if (!quiet.current) void refresh()
        }, POLL_MS)
    }
    const stop = () => {
      if (timer !== null) clearInterval(timer)
      timer = null
    }
    const onVisibility = () => {
      if (document.hidden) stop()
      else {
        void refresh()
        start()
      }
    }
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      live.current = false
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refresh])

  /** Every action: run it, say why it was refused if it was, and read the conversation again. */
  const act = useCallback(
    async <T,>(run: () => Promise<Result<T>>): Promise<boolean> => {
      setBusy(true)
      setError(null)
      const out = await run()
      if (!out.ok) setError(errorLabel(out.error as CollectorError))
      await refresh()
      setBusy(false)
      return out.ok
    },
    [refresh],
  )

  const on: ThreadHandlers = {
    respond: (accept) => void act(() => respond(id, accept)),
    send: (body) => act(() => sendMessage(id, body)),
    photoRequest: () => void act(() => sendMessage(id, '', 'photo_request')),
    offerPrice: (amount: number, currency: Currency) => act(() => offerMake(id, 'price', amount, currency)),
    offerTrade: (ids) => act(() => offerMake(id, 'trade', null, 'ILS', ids)),
    answer: (offerId, action) => void act(() => offerRespond(offerId, action)),
    counter: (offerId, amount) => act(() => offerRespond(offerId, 'counter', amount)),
    step: (which) => void act(() => step(id, which)),
    loadTradeItems: () => {
      void closetMine().then((out) => {
        if (!live.current) return
        setTradeItems(out.ok ? out.items.filter((row) => row.forTrade && row.state === 'held') : [])
      })
    },
    addToCloset: async (slug, kitId) => {
      const out = await have(slug, kitId, true)
      if (!out.ok) setError(errorLabel(out.error))
      return out.ok
    },
  }

  if (load.state === 'loading') {
    return <p className="mt-stack border-rule border-dashed border-ink/50 p-4 font-body text-step--1 text-muted">{t('market.thread.loading')}</p>
  }
  if (load.state === 'guest') {
    return (
      <div className="mt-stack flex flex-col gap-3">
        <p className="font-body text-step--1 leading-relaxed text-ink">{t('market.thread.guest')}</p>
        <SignInPrompt next={`/kits/market/c/${encodeURIComponent(id)}`} />
      </div>
    )
  }
  if (load.state !== 'ready') {
    const title = load.state === 'off' ? t('market.off.title') : load.state === 'gone' ? t('market.thread.gone.title') : t('market.error.title')
    const body = load.state === 'off' ? t('market.off.body') : load.state === 'gone' ? t('market.thread.gone.body') : load.message
    return (
      <>
        <EmptyState title={title} body={body} tone={load.state === 'error' ? 'red' : 'ink'} />
        <Link href="/kits/market" className="mt-3 inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-red underline underline-offset-4">
          ← {t('market.item.back')}
        </Link>
      </>
    )
  }

  return (
    <ThreadView
      thread={load.thread}
      shirts={shirts}
      tradeItems={tradeItems}
      busy={busy}
      error={error}
      on={on}
      onBlocked={() => router.push('/kits/market')}
    />
  )
}
