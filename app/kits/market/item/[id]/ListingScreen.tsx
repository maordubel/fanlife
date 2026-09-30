'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { MerchantOffers } from '@/components/collector/MerchantOffers'
import { SignInPrompt } from '@/components/collector/SignInPrompt'
import { threadHref } from '@/components/market/ConnectPanel'
import { ListingView, type Viewer } from '@/components/market/ListingView'
import { EmptyState } from '@/components/ui/EmptyState'
import { connect, marketItem, shirtSignals } from '@/lib/collector/api'
import { errorLabel } from '@/lib/collector/labels'
import type { CollectorShirt, PublicItem, ShirtSignal } from '@/lib/collector/types'
import { t } from '@/lib/i18n'
import { portalConfigured } from '@/lib/portal/env'
import { sessionUserId } from '@/lib/portal/sync'

type Load =
  | { state: 'loading' }
  | { state: 'off' }
  | { state: 'gone' }
  | { state: 'error'; message: string }
  | { state: 'ready'; item: PublicItem; connectionId: string | null }

/**
 * The listing's client half: `marketItem(id)` for the copy, `shirtSignals` for the demand under it,
 * and `connect()` — which opens the conversation and walks straight into it.
 */
export function ListingScreen({ id, shirts }: { id: string; shirts: Record<string, CollectorShirt> }) {
  const router = useRouter()
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [viewer, setViewer] = useState<Viewer>('loading')
  const [signal, setSignal] = useState<ShirtSignal | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!portalConfigured()) {
      setLoad({ state: 'off' })
      return
    }
    let live = true
    void sessionUserId().then((user) => live && setViewer(user ? 'member' : 'guest'))
    void marketItem(id).then((out) => {
      if (!live) return
      if (out.ok) setLoad({ state: 'ready', item: out.item, connectionId: out.connectionId })
      else if (out.error === 'not_found' || out.error === 'not_available') setLoad({ state: 'gone' })
      else if (out.error === 'off') setLoad({ state: 'off' })
      else setLoad({ state: 'error', message: errorLabel(out.error) })
    })
    return () => {
      live = false
    }
  }, [id])

  const slug = load.state === 'ready' ? load.item.archiveSlug : null
  useEffect(() => {
    if (!slug) return
    let live = true
    void shirtSignals([slug]).then((rows) => live && setSignal(rows[slug] ?? null))
    return () => {
      live = false
    }
  }, [slug])

  if (load.state === 'loading') {
    return <p className="mt-stack border-rule border-dashed border-ink/50 p-4 font-body text-step--1 text-muted">{t('market.loading')}</p>
  }
  if (load.state !== 'ready') {
    const title = load.state === 'off' ? t('market.off.title') : load.state === 'gone' ? t('market.item.gone.title') : t('market.error.title')
    const body = load.state === 'off' ? t('market.off.body') : load.state === 'gone' ? t('market.item.gone.body') : load.message
    return (
      <>
        <EmptyState title={title} body={body} tone={load.state === 'error' ? 'red' : 'ink'} />
        <Link href="/kits/market" className="mt-3 inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-red underline underline-offset-4">
          ← {t('market.item.back')}
        </Link>
      </>
    )
  }

  const { item, connectionId } = load
  const shirt = shirts[item.archiveSlug] ?? null

  const onConnect = async (kind: 'buy' | 'trade', body: string) => {
    setBusy(true)
    setError(null)
    const out = await connect(item.id, kind, body || undefined)
    if (out.ok) {
      router.push(threadHref(out.connectionId))
      return
    }
    setBusy(false)
    if (out.error === 'auth_required') setViewer('guest')
    else setError(errorLabel(out.error))
  }

  return (
    <ListingView
      item={item}
      shirt={shirt}
      signal={signal}
      viewer={viewer}
      connectionId={connectionId}
      connect={{ busy, error }}
      onConnect={(kind, body) => void onConnect(kind, body)}
      signIn={<SignInPrompt next={`/kits/market/item/${encodeURIComponent(item.id)}`} />}
      shops={<MerchantOffers slug={item.archiveSlug} kitId={item.kitId} season={shirt?.seasonLabel ?? null} />}
      onBlocked={() => router.push('/kits/market')}
    />
  )
}
