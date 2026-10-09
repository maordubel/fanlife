'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Num } from '@/components/ui/Num'
import type { CollectorShirt } from '@/lib/collector/types'
import { shirtName } from '@/lib/fanlife/collector/market'
import { circleOverview, circleSet, circlesMine } from '@/lib/fanlife/hub/api'
import { clubForKey } from '@/lib/fanlife/hub/clubs'
import { h } from '@/lib/fanlife/hub/copy'
import { countryFlag, countryName } from '@/lib/fanlife/hub/places'
import type { CircleKind, CircleOverview } from '@/lib/fanlife/hub/types'
import { portalConfigured } from '@/lib/portal/env'

import { Kicker, Notice, buttonPlain, buttonPrimary } from './HubParts'

type State = { state: 'loading' } | { state: 'off' } | { state: 'bad' } | { state: 'ready'; data: CircleOverview }

/** What a circle is called: a club's own name, a country's name, or the city as typed. */
function nameOf(kind: CircleKind, key: string, label: string | null): string {
  if (kind === 'club') return clubForKey(key)?.name ?? label ?? key
  if (kind === 'country') return `${countryFlag(key)} ${countryName(key)}`
  return label ?? key
}

/** The market filter that stands for this circle. Clubs go by registry id (what the shirt catalogue uses). */
function marketHref(kind: CircleKind, key: string, view?: 'wanted'): string {
  const p = new URLSearchParams()
  if (kind === 'club') p.set('club', clubForKey(key)?.id ?? key)
  else if (kind === 'country') p.set('country', key)
  else p.set('city', key)
  if (view) p.set('view', view)
  return `/market?${p.toString()}`
}

export function CircleScreen({ kind, keyId, shirts }: { kind: CircleKind; keyId: string; shirts: Readonly<Record<string, CollectorShirt>> }) {
  const [s, setS] = useState<State>({ state: 'loading' })
  const [signedIn, setSignedIn] = useState(false)
  const [following, setFollowing] = useState(false)

  useEffect(() => {
    if (!portalConfigured()) return setS({ state: 'off' })
    let live = true
    void circleOverview(kind, keyId).then((out) => {
      if (!live) return
      if (out.ok) {
        setS({ state: 'ready', data: out })
        setFollowing(out.following)
      } else setS({ state: 'bad' })
    })
    void circlesMine().then((out) => live && setSignedIn(out.ok))
    return () => {
      live = false
    }
  }, [kind, keyId])

  const toggle = async () => {
    const out = await circleSet(kind, keyId, !following)
    if (out.ok) setFollowing(out.circles.some((c) => c.kind === kind && c.key === keyId))
  }

  const data = s.state === 'ready' ? s.data : null

  return (
    <div className="mt-stack" data-hub="circle">
      <p><Link href="/market?view=circles" className="min-h-tap inline-flex items-center font-body text-step--1 font-extrabold text-sign underline underline-offset-4">← {h('hub.circle.back')}</Link></p>

      {s.state === 'off' ? (
        <Notice title={h('hub.circle.bad')} body="" />
      ) : s.state === 'bad' ? (
        <Notice title={h('hub.circle.bad')} body="" />
      ) : s.state === 'loading' || !data ? (
        <p className="mt-3 font-body text-step--1 text-muted" role="status">{h('hub.circles.loading')}</p>
      ) : (
        <>
          <Kicker>{h(`hub.circle.kind.${kind}` as 'hub.circle.kind.club')}</Kicker>
          <h2 className="mt-1 font-display text-step-2 leading-tight text-ink">{h('hub.circle.title', { name: nameOf(kind, keyId, data.label) })}</h2>
          <p className="mt-1 font-body text-step--1 text-ink">
            <Num>{h('hub.circle.stats', { shirts: data.shirts, week: data.newThisWeek, wanted: data.wanted })}</Num>
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={marketHref(kind, keyId)} className={buttonPrimary}>{h('hub.circle.seeShirts')}</Link>
            <Link href={marketHref(kind, keyId, 'wanted')} className={buttonPlain}>{h('hub.circle.seeWanted')}</Link>
            {signedIn ? (
              <button type="button" onClick={() => void toggle()} aria-pressed={following} className={buttonPlain}>
                {following ? h('hub.circles.following') : h('hub.circles.follow')}
              </button>
            ) : null}
          </div>

          {data.shirts === 0 ? (
            <p className="mt-stack border-rule border-dashed border-ink/50 p-4 font-body text-step--1 text-muted">{h('hub.circle.empty')}</p>
          ) : data.top.length ? (
            <section className="mt-stack" aria-label={h('hub.circle.top')}>
              <h3 className="font-body text-[11px] font-extrabold uppercase tracking-wide text-muted">{h('hub.circle.top')}</h3>
              <ul className="mt-1 grid gap-1.5">
                {data.top.map((t) => (
                  <li key={t.slug}>
                    <Link href={`/market?slug=${encodeURIComponent(t.slug)}`} className="flex min-h-tap items-center justify-between gap-3 border-hair border-ink/30 bg-paper px-3 py-1.5 font-body text-[13px] font-extrabold text-ink">
                      <span className="min-w-0 truncate">{shirts[t.slug] ? shirtName(shirts[t.slug]) : t.slug}</span>
                      <span className="text-muted"><Num>{t.count}</Num></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
