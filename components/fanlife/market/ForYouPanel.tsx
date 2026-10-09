'use client'

import type { ReactNode } from 'react'

import { sizeLabel } from '@/lib/fanlife/collector/labels'
import type { CollectorShirt } from '@/lib/collector/types'
import type { MyWant, SavedSearch } from '@/lib/fanlife/hub/types'
import { formatPrice } from '@/lib/fanlife/collector/labels'
import { h, type HubKey } from '@/lib/fanlife/hub/copy'

import { MatchesPanel, type MatchesState } from '@/components/fanlife/market/MatchesPanel'
import { ArchivePhoto, ShirtDate } from '@/components/fanlife/market/ShirtBits'
import { Kicker, Notice, buttonPrimary, linkQuiet } from './HubParts'

const MODE: Record<string, HubKey> = { buy: 'hub.mode.buy', swap: 'hub.mode.swap', any: 'hub.mode.any' }

/**
 * "For you": what the market has found for this collector — matches, the searches they saved (each says how
 * many copies are open now and can alert them), and their own requests, public or private, with the private
 * budget shown to them alone.
 */
export function ForYouPanel({
  matches,
  searches,
  wants,
  shirts,
  signIn,
  onRunSearch,
  onDeleteSearch,
  onToggleAlert,
  onTogglePublic,
  onEditWant,
  onNewRequest,
}: {
  matches: MatchesState
  searches: SavedSearch[]
  wants: MyWant[]
  shirts: Readonly<Record<string, CollectorShirt>>
  signIn: ReactNode
  onRunSearch: (s: SavedSearch) => void
  onDeleteSearch: (id: string) => void
  onToggleAlert: (id: string, on: boolean) => void
  onTogglePublic: (id: string, on: boolean) => void
  onEditWant: (slug: string) => void
  onNewRequest: () => void
}) {
  if (matches.state === 'guest') {
    return (
      <Notice title={h('hub.foryou.guestTitle')} body={h('hub.foryou.guestBody')}>
        {signIn}
      </Notice>
    )
  }
  return (
    <div className="mt-3 space-y-stack" data-hub="foryou">
      <MatchesPanel matches={matches} shirts={shirts} shielded={() => false} onUncover={() => undefined} signIn={signIn} />

      <section aria-labelledby="hub-searches">
        <Kicker>{h('hub.searches.kicker')}</Kicker>
        <h3 id="hub-searches" className="font-sign text-step-1 leading-tight text-ink">{h('hub.searches.title')}</h3>
        {searches.length === 0 ? (
          <p className="mt-1 max-w-prose font-body text-step--1 leading-relaxed text-muted">{h('hub.searches.empty')}</p>
        ) : (
          <ul className="mt-2 divide-y-hair divide-dashed divide-ink/40 border-rule border-ink bg-sheet">
            {searches.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-2.5">
                <button type="button" onClick={() => onRunSearch(s)} className="min-h-tap min-w-0 flex-1 text-start">
                  <span className="block truncate font-body text-[14px] font-extrabold text-ink">{s.name}</span>
                  <span className="block font-body text-[11.5px] text-muted">
                    {s.open === 0 ? h('hub.searches.none') : s.open === 1 ? h('hub.searches.one') : h('hub.searches.open', { n: String(s.open) })}
                  </span>
                </button>
                <button type="button" onClick={() => onToggleAlert(s.id, !s.notify)} aria-pressed={s.notify} className={`min-h-tap border-hair px-2.5 font-body text-[11.5px] font-extrabold ${s.notify ? 'border-ink bg-ink text-paper' : 'border-ink/40 text-ink'}`}>
                  {s.notify ? h('hub.searches.alertOn') : h('hub.searches.alertOff')}
                </button>
                <button type="button" onClick={() => onDeleteSearch(s.id)} className="min-h-tap px-1 font-body text-[11.5px] font-extrabold text-sign underline underline-offset-4">
                  {h('hub.searches.delete')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="hub-mine">
        <Kicker>{h('hub.mine.kicker')}</Kicker>
        <h3 id="hub-mine" className="font-sign text-step-1 leading-tight text-ink">{h('hub.mine.title')}</h3>
        {wants.length === 0 ? (
          <p className="mt-1 max-w-prose font-body text-step--1 leading-relaxed text-muted">{h('hub.mine.empty')}</p>
        ) : (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {wants.map((w) => {
              const shirt = shirts[w.archiveSlug]
              if (!shirt) return null
              return (
                <li key={w.id} className="flex gap-3 border-rule border-ink bg-sheet p-2.5" data-hub-want={w.id}>
                  <span className="block w-[56px] shrink-0"><ArchivePhoto shirt={shirt} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-poster text-[18px] leading-none text-ink"><ShirtDate shirt={shirt} /></span>
                    <span className="block truncate font-body text-[12px] font-extrabold text-red">{shirt.variantHe}</span>
                    <span className="mt-0.5 block font-body text-[11.5px] text-ink">
                      {w.size ? sizeLabel(w.size) : h('hub.wanted.anySize')} · {h(MODE[w.mode]!)}
                      {w.maxPrice ? ` · ${h('hub.mine.budget', { amount: formatPrice(w.maxPrice, w.currency) })}` : ''}
                    </span>
                    <span className="block font-body text-[11.5px] font-extrabold text-sign">
                      {w.available === 0 ? h('hub.mine.noneOpen') : w.available === 1 ? h('hub.mine.oneOpen') : h('hub.mine.open', { n: String(w.available) })}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3">
                      <button type="button" onClick={() => onTogglePublic(w.id, !w.public)} className={linkQuiet}>
                        {w.public ? h('hub.mine.makePrivate') : h('hub.mine.makePublic')}
                      </button>
                      <button type="button" onClick={() => onEditWant(w.archiveSlug)} className={linkQuiet}>{h('hub.mine.edit')}</button>
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        <button type="button" onClick={onNewRequest} className={`${buttonPrimary} mt-3`}>{h('hub.actions.look')}</button>
      </section>
    </div>
  )
}
