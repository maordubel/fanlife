'use client'

import Link from 'next/link'
import { useState } from 'react'

import { CollectorTag } from '@/components/fanlife/collector/CollectorTag'
import { sizeLabel, errorLabel } from '@/lib/fanlife/collector/labels'
import { shirtName } from '@/lib/fanlife/collector/market'
import type { CollectorShirt } from '@/lib/collector/types'
import { wantRespond } from '@/lib/fanlife/hub/api'
import type { WantedRow } from '@/lib/fanlife/hub/types'
import { h, type HubKey } from '@/lib/fanlife/hub/copy'

import { ArchivePhoto, ShirtDate } from '@/components/fanlife/market/ShirtBits'
import { buttonPrimary, linkQuiet } from './HubParts'

const MODE: Record<string, HubKey> = { buy: 'hub.mode.buy', swap: 'hub.mode.swap', any: 'hub.mode.any' }
const TRAVEL: Record<string, HubKey> = { ship: 'hub.delivery.shipOnly', local: 'hub.delivery.localOnly', both: 'hub.delivery.both' }

/**
 * מבוקשות — the wanted board. Each card is a public request: the shirt, the size, how the collector wants to
 * get it, and a short note. It never carries a budget or a name — the requester is "Collector #N". "I have it"
 * tells the requester which of YOUR open copies fits; nothing is promised until they open a conversation.
 */
export function WantedBoard({
  rows,
  shirts,
  signedIn,
  onRemoveOwn,
}: {
  rows: WantedRow[]
  shirts: Readonly<Record<string, CollectorShirt>>
  signedIn: boolean
  onRemoveOwn: (id: string) => void
}) {
  return (
    <ul className="mt-3 grid gap-3 sm:grid-cols-2" data-hub="wanted">
      {rows.map((row) => {
        const shirt = shirts[row.archiveSlug]
        if (!shirt) return null
        return (
          <li key={row.id} className="min-w-0">
            <WantedCard row={row} shirt={shirt} signedIn={signedIn} onRemoveOwn={onRemoveOwn} />
          </li>
        )
      })}
    </ul>
  )
}

function WantedCard({ row, shirt, signedIn, onRemoveOwn }: { row: WantedRow; shirt: CollectorShirt; signedIn: boolean; onRemoveOwn: (id: string) => void }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | { error: string }>('idle')
  const mine = row.myMatches[0]
  const answer = async () => {
    if (!mine) return
    setState('sending')
    const out = await wantRespond(row.id, mine)
    setState(out.ok ? 'sent' : { error: errorLabel(out.error) })
  }
  return (
    <article className="flex h-full flex-col border-plate border-ink bg-sheet" data-wanted={row.id}>
      <header className="flex items-stretch gap-3 p-2.5">
        <span className="block w-[84px] shrink-0 bg-paper">
          <ArchivePhoto shirt={shirt} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <span className="font-body text-[10px] font-extrabold uppercase tracking-[.14em] text-sign">{h('hub.wanted.lookingFor')}</span>
          <span className="font-poster text-[24px] leading-none text-ink">
            <ShirtDate shirt={shirt} />
          </span>
          <span className="truncate font-body text-[12px] font-extrabold text-red">{shirt.variantHe}</span>
          <span className="flex flex-wrap gap-1 pt-1">
            <span className="border-hair border-ink px-1.5 py-0.5 font-body text-[10.5px] font-extrabold text-ink">
              {row.size ? h('hub.wanted.size', { size: sizeLabel(row.size) }) : h('hub.wanted.anySize')}
            </span>
            <span className="border-hair border-ink/40 px-1.5 py-0.5 font-body text-[10.5px] font-bold text-ink">{h(MODE[row.mode]!)}</span>
            <span className="border-hair border-ink/40 px-1.5 py-0.5 font-body text-[10.5px] font-bold text-muted">{h(TRAVEL[row.delivery]!)}</span>
          </span>
        </span>
      </header>
      {row.note ? <p className="border-t-hair border-dashed border-ink/45 px-3 py-2 font-body text-[12.5px] leading-snug text-ink">{row.note}</p> : null}
      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t-hair border-dashed border-ink/45 px-3 py-2">
        {row.requester ? <CollectorTag label={row.requester} compact /> : <span />}
        {row.mine ? (
          <button type="button" onClick={() => onRemoveOwn(row.id)} className={`${linkQuiet} min-h-tap`}>
            {h('hub.wanted.withdraw')}
          </button>
        ) : !signedIn ? (
          <span className="font-body text-[11.5px] text-muted">{h('hub.wanted.signInToAnswer')}</span>
        ) : state === 'sent' ? (
          <span className="font-body text-[12px] font-extrabold text-sign" role="status">{h('hub.wanted.sent')}</span>
        ) : mine ? (
          <button type="button" onClick={() => void answer()} disabled={state === 'sending'} className={`${buttonPrimary} min-h-tap`}>
            {h('hub.wanted.iHaveIt')}
          </button>
        ) : (
          <Link href={`/shirts?shirt=${encodeURIComponent(row.archiveSlug)}`} className={linkQuiet}>
            {h('hub.wanted.openOne')}
          </Link>
        )}
      </footer>
      {typeof state === 'object' ? <p className="px-3 pb-2 font-body text-[12px] text-red" role="alert">{state.error}</p> : null}
      <span className="sr-only">{shirtName(shirt)}</span>
    </article>
  )
}
