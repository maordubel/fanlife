'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'

import { HubListings } from '@/components/fanlife/market/HubListings'
import { ShirtDate } from '@/components/fanlife/market/ShirtBits'
import type { CollectorShirt } from '@/lib/collector/types'
import { errorLabel } from '@/lib/fanlife/collector/labels'
import { shirtName } from '@/lib/fanlife/collector/market'
import { pipe, wantRespond } from '@/lib/fanlife/hub/api'
import { clubNameForKey } from '@/lib/fanlife/hub/clubs'
import { h } from '@/lib/fanlife/hub/copy'
import type { MyWant, Pipe, WantedRow } from '@/lib/fanlife/hub/types'
import { Num } from '@/components/ui/Num'

import { Kicker, Notice, buttonPlain, buttonPrimary } from './HubParts'
import { circleHref } from './CirclesPanel'

type State = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; pipe: Pipe }

/**
 * "Your pipe": what the whole market has for ONE collector right now, nearest first — shirts that match their
 * list, public requests their copies would answer, what's new in the clubs they follow. Every line says why
 * it is here; nothing is scored or ranked by a number the collector cannot see.
 */
export function PipePanel({
  signedIn,
  signIn,
  shirts,
  wants,
  onFocus,
  version,
}: {
  signedIn: boolean | null
  signIn: ReactNode
  shirts: Readonly<Record<string, CollectorShirt>>
  wants: readonly MyWant[]
  onFocus: (slug: string) => void
  /** bump to reload (after the collector changes their list) */
  version: number
}) {
  const [data, setData] = useState<State>({ state: 'loading' })
  const [done, setDone] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!signedIn) return
    let live = true
    void pipe().then((out) => {
      if (live) setData(out.ok ? { state: 'ready', pipe: out } : { state: 'error', message: errorLabel(out.error) })
    })
    return () => {
      live = false
    }
  }, [signedIn, version])

  if (signedIn === false) {
    return (
      <section className="mt-3" aria-label={h('hub.pipe.title')} data-hub="pipe">
        <Kicker>{h('hub.pipe.title')}</Kicker>
        <p className="mt-1 font-body text-step--1 text-ink">{h('hub.pipe.signIn')}</p>
        <div className="mt-2">{signIn}</div>
      </section>
    )
  }
  if (signedIn === null || data.state === 'loading') return <p className="mt-3 font-body text-step--1 text-muted" role="status">{h('hub.pipe.loading')}</p>
  if (data.state === 'error') return <Notice title={h('hub.pipe.title')} body={data.message} tone="red" />

  const { found, answers, clubs, help } = data.pipe
  const respond = async (row: WantedRow) => {
    const first = row.myMatches[0]
    if (!first) return
    const out = await wantRespond(row.id, first)
    if (out.ok) setDone((d) => ({ ...d, [row.id]: true }))
  }
  const clubRows = Object.entries(clubs).filter(([, n]) => n > 0)

  return (
    <section className="mt-3" aria-label={h('hub.pipe.title')} data-hub="pipe">
      <Kicker>{h('hub.pipe.title')}</Kicker>
      <p className="mt-1 max-w-prose font-body text-[12.5px] leading-snug text-muted">{h('hub.pipe.lede')}</p>

      <h3 className="mt-3 font-sign text-step-0 leading-tight text-ink">{h('hub.pipe.found')}</h3>
      {found.length ? (
        <HubListings items={found} shirts={shirts} wants={wants} focused={false} onFocus={onFocus} />
      ) : (
        <p className="mt-1 font-body text-step--1 text-muted">{h('hub.pipe.foundEmpty')}</p>
      )}

      <h3 className="mt-stack font-sign text-step-0 leading-tight text-ink">{h('hub.pipe.answers')}</h3>
      {answers.length ? (
        <ul className="mt-1 grid gap-2 sm:grid-cols-2">
          {answers.map((row) => {
            const shirt = shirts[row.archiveSlug]
            return (
              <li key={row.id} className="flex items-center gap-3 border-rule border-ink bg-sheet p-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block font-poster text-[20px] leading-none text-ink">{shirt ? <ShirtDate shirt={shirt} /> : row.archiveSlug}</span>
                  <span className="block truncate font-body text-[12px] font-extrabold text-red">{shirt ? shirtName(shirt) : ''}</span>
                  {row.note ? <span className="mt-0.5 block truncate font-body text-[11.5px] text-muted">“{row.note}”</span> : null}
                </span>
                {done[row.id] ? (
                  <span className="font-body text-[12px] font-extrabold text-ink" role="status">{h('hub.pipe.responded')}</span>
                ) : (
                  <button type="button" onClick={() => void respond(row)} className={`${buttonPrimary} min-h-tap`}>{h('hub.pipe.respond')}</button>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-1 font-body text-step--1 text-muted">{h('hub.pipe.answersEmpty')}</p>
      )}

      <h3 className="mt-stack font-sign text-step-0 leading-tight text-ink">{h('hub.pipe.clubs')}</h3>
      {clubRows.length ? (
        <ul className="mt-1 flex flex-wrap gap-2">
          {clubRows.map(([key, n]) => (
            <li key={key}>
              <Link href={circleHref('club', key)} className={buttonPlain}>
                <Num>{h('hub.pipe.clubNew', { n, club: clubNameForKey(key) })}</Num>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 font-body text-step--1 text-muted">{h('hub.pipe.noClubs')}</p>
      )}

      {help > 0 ? (
        <p className="mt-stack flex flex-wrap items-center gap-2 border-rule border-dashed border-ink/50 p-3">
          <span className="font-body text-step--1 text-ink"><Num>{h('hub.pipe.help', { n: help })}</Num></span>
          <Link href="/market/help" className={buttonPlain}>{h('hub.pipe.helpCta')}</Link>
        </p>
      ) : null}
    </section>
  )
}
