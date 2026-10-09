'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { Num } from '@/components/ui/Num'
import type { CollectorShirt } from '@/lib/collector/types'
import { circleSet, circlesMine, marketSearch } from '@/lib/fanlife/hub/api'
import { clubNameForKey } from '@/lib/fanlife/hub/clubs'
import { h } from '@/lib/fanlife/hub/copy'
import { countryFlag, countryName } from '@/lib/fanlife/hub/places'
import type { CircleKind, CircleRef, HubFacets, Place } from '@/lib/fanlife/hub/types'

import { MyCopiesReach } from './MyCopiesReach'
import { PlaceCard } from './PlaceCard'
import { Kicker, buttonPlain } from './HubParts'

export const circleHref = (kind: CircleKind, key: string) => `/circles/${kind}/${encodeURIComponent(key)}`
const KIND_WORD: Record<CircleKind, string> = {
  club: h('hub.circle.kind.club'),
  country: h('hub.circle.kind.country'),
  city: h('hub.circle.kind.city'),
}
const count = (n: number) => (n === 1 ? h('hub.circles.oneShirt') : h('hub.circles.shirts', { n }))

function Row({ href, title, sub, on, onToggle, disabled }: { href: string; title: string; sub: string; on: boolean; onToggle: () => void; disabled: boolean }) {
  return (
    <li className="flex items-stretch gap-2 border-hair border-ink/30 bg-paper">
      <Link href={href} className="flex min-h-tap min-w-0 flex-1 flex-col justify-center px-3 py-1.5">
        <span className="truncate font-body text-[14px] font-extrabold text-ink">{title}</span>
        <span className="font-body text-[11.5px] text-muted"><Num>{sub}</Num></span>
      </Link>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={on}
        className={`min-h-tap shrink-0 border-s-hair px-3 font-body text-[12px] font-extrabold disabled:opacity-40 ${on ? 'bg-ink text-paper' : 'text-sign'}`}
      >
        {on ? h('hub.circles.following') : h('hub.circles.follow')}
      </button>
    </li>
  )
}

/**
 * Circles: the market looked at one club, one country or one city at a time. The numbers come from one search's
 * facets, so they are what the market actually holds. A circle is never a room to talk in — it is shirts.
 */
export function CirclesPanel({
  shirts,
  signedIn,
  signIn,
  place,
  onPlace,
}: {
  shirts: Readonly<Record<string, CollectorShirt>>
  signedIn: boolean | null
  signIn: ReactNode
  place: Place | null
  onPlace: (next: Place) => void
}) {
  const [facets, setFacets] = useState<HubFacets | null>(null)
  const [mine, setMine] = useState<CircleRef[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    let live = true
    void marketSearch({}, null, 1).then((out) => {
      if (!live) return
      if (out.ok) setFacets(out.facets)
      else setError(true)
    })
    return () => {
      live = false
    }
  }, [])
  const loadMine = useCallback(() => void circlesMine().then((out) => out.ok && setMine(out.circles)), [])
  useEffect(() => {
    if (signedIn) loadMine()
  }, [signedIn, loadMine])

  const follows = (kind: CircleKind, key: string) => mine.some((c) => c.kind === kind && c.key === key)
  const toggle = async (kind: CircleKind, key: string) => {
    const out = await circleSet(kind, key, !follows(kind, key))
    if (out.ok) setMine(out.circles)
  }

  const clubs = useMemo(
    () => Object.entries(facets?.clubs ?? {}).map(([key, n]) => ({ key, n, name: clubNameForKey(key) })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)),
    [facets],
  )
  const countries = useMemo(
    () => Object.entries(facets?.countries ?? {}).map(([key, n]) => ({ key, n, name: countryName(key) })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)),
    [facets],
  )
  const followed = mine

  return (
    <div data-hub="circles">
      <Kicker>{h('hub.circles.title')}</Kicker>
      <p className="mt-1 max-w-prose font-body text-step--1 leading-relaxed text-ink">{h('hub.circles.lede')}</p>

      {signedIn === false ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-body text-[12.5px] text-muted">{h('hub.circles.signIn')}</span>
          {signIn}
        </div>
      ) : null}

      {signedIn ? (
        <>
          <PlaceCard place={place} onChange={onPlace} />
          {followed.length ? (
            <section className="mt-stack" aria-label={h('hub.circles.mine')}>
              <h3 className="font-body text-[11px] font-extrabold uppercase tracking-wide text-muted">{h('hub.circles.mine')}</h3>
              <ul className="mt-1 grid gap-1.5">
                {followed.map((c) => (
                  <Row
                    key={`${c.kind}:${c.key}`}
                    href={circleHref(c.kind, c.key)}
                    title={c.kind === 'club' ? clubNameForKey(c.key) : c.kind === 'country' ? `${countryFlag(c.key)} ${countryName(c.key)}` : c.key}
                    sub={KIND_WORD[c.kind]}
                    on
                    onToggle={() => void toggle(c.kind, c.key)}
                    disabled={false}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      {error ? (
        <p className="mt-stack border-rule border-dashed border-ink/50 p-4 font-body text-step--1 text-muted">{h('hub.circles.empty')}</p>
      ) : facets === null ? (
        <p className="mt-stack font-body text-step--1 text-muted" role="status">{h('hub.circles.loading')}</p>
      ) : clubs.length === 0 ? (
        <p className="mt-stack border-rule border-dashed border-ink/50 p-4 font-body text-step--1 text-muted">{h('hub.circles.empty')}</p>
      ) : (
        <>
          <section className="mt-stack" aria-label={h('hub.circles.clubs')}>
            <h3 className="font-body text-[11px] font-extrabold uppercase tracking-wide text-muted">{h('hub.circles.clubs')}</h3>
            <ul className="mt-1 grid gap-1.5 sm:grid-cols-2">
              {clubs.map((c) => (
                <Row key={c.key} href={circleHref('club', c.key)} title={c.name} sub={count(c.n)} on={follows('club', c.key)} onToggle={() => void toggle('club', c.key)} disabled={!signedIn} />
              ))}
            </ul>
          </section>
          {countries.length ? (
            <section className="mt-stack" aria-label={h('hub.circles.countries')}>
              <h3 className="font-body text-[11px] font-extrabold uppercase tracking-wide text-muted">{h('hub.circles.countries')}</h3>
              <p className="font-body text-[11.5px] text-muted">{h('hub.circles.countriesLede')}</p>
              <ul className="mt-1 grid gap-1.5 sm:grid-cols-2">
                {countries.map((c) => (
                  <Row key={c.key} href={circleHref('country', c.key)} title={`${countryFlag(c.key)} ${c.name}`} sub={count(c.n)} on={follows('country', c.key)} onToggle={() => void toggle('country', c.key)} disabled={!signedIn} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      {signedIn ? <MyCopiesReach shirts={shirts} place={place} /> : null}

      <p className="mt-stack">
        <Link href="/market/help" className={buttonPlain}>{h('hub.help.title')}</Link>
      </p>
    </div>
  )
}
