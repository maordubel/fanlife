'use client'

import { useCallback, useEffect, useState } from 'react'

import { MarketBoard, type TableState } from '@/components/market/MarketBoard'
import { MarketSignIn } from '@/components/market/MarketSignIn'
import type { MatchesState } from '@/components/market/MatchesPanel'
import { marketList, matches } from '@/lib/collector/api'
import { errorLabel } from '@/lib/collector/labels'
import { slugFromSearch } from '@/lib/collector/market'
import type { CollectorShirt, PublicItem } from '@/lib/collector/types'
import { portalConfigured } from '@/lib/portal/env'

const PAGE = 100

/**
 * The market's client half: reads the table (`marketList`) and the matches (`matches`), and keeps
 * `?slug=` in the address so "all the copies of the 1985 away shirt" is a link a fan can send.
 * Every call answers a value rather than throwing (`lib/collector/api.ts`), so each box has its
 * own state and a refusal in one never blanks the other.
 */
export function MarketScreen({ shirts }: { shirts: Record<string, CollectorShirt> }) {
  const [slug, setSlug] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [table, setTable] = useState<TableState>({ state: 'loading' })
  const [match, setMatch] = useState<MatchesState>({ state: 'loading' })

  // the address is read once, on the client — a static page has no search params at build time
  useEffect(() => {
    setSlug(slugFromSearch(window.location.search, shirts))
    setReady(true)
  }, [shirts])

  useEffect(() => {
    if (!ready) return
    if (!portalConfigured()) {
      setTable({ state: 'off' })
      return
    }
    let live = true
    setTable({ state: 'loading' })
    void marketList({ slug, limit: PAGE }).then((rows) => {
      if (live) setTable({ state: 'ready', items: rows, more: rows.length >= PAGE })
    })
    return () => {
      live = false
    }
  }, [ready, slug])

  useEffect(() => {
    if (!portalConfigured()) {
      setMatch({ state: 'off' })
      return
    }
    let live = true
    void matches().then((out) => {
      if (!live) return
      if (out.ok) setMatch({ state: 'ready', data: out })
      else if (out.error === 'auth_required') setMatch({ state: 'guest' })
      else if (out.error === 'off') setMatch({ state: 'off' })
      else setMatch({ state: 'error', message: errorLabel(out.error) })
    })
    return () => {
      live = false
    }
  }, [])

  const choose = useCallback((next: string | null) => {
    setSlug(next)
    try {
      const url = new URL(window.location.href)
      if (next) url.searchParams.set('slug', next)
      else url.searchParams.delete('slug')
      window.history.replaceState(null, '', `${url.pathname}${url.search}`)
      window.scrollTo({ top: 0 })
    } catch {
      // the address bar is a convenience; the table has already moved
    }
  }, [])

  const more = useCallback(() => {
    if (table.state !== 'ready' || table.loadingMore) return
    const last: PublicItem | undefined = table.items[table.items.length - 1]
    if (!last?.openedAt) return
    setTable({ ...table, loadingMore: true })
    void marketList({ slug, limit: PAGE, before: last.openedAt }).then((rows) => {
      setTable((now) =>
        now.state === 'ready'
          ? { state: 'ready', items: [...now.items, ...rows.filter((row) => !now.items.some((have) => have.id === row.id))], more: rows.length >= PAGE }
          : now,
      )
    })
  }, [slug, table])

  return (
    <MarketBoard
      shirts={shirts}
      table={table}
      matches={match}
      slug={slug}
      onSlug={choose}
      onMore={more}
      signIn={<MarketSignIn next={slug ? `/kits/market?slug=${encodeURIComponent(slug)}` : '/kits/market'} />}
    />
  )
}
