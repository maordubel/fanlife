'use client'

import { useCallback, useEffect, useState } from 'react'

import { closetMine } from '@/lib/collector/api'
import type { CollectorShirt, OwnerItem } from '@/lib/collector/types'
import { shirtName } from '@/lib/fanlife/collector/market'
import { errorLabel } from '@/lib/fanlife/collector/labels'
import { itemDeliverySet, itemReachSet } from '@/lib/fanlife/hub/api'
import { h } from '@/lib/fanlife/hub/copy'
import type { Delivery, Place, ShipScope } from '@/lib/fanlife/hub/types'

import { Chip, Kicker } from './HubParts'

type Row = OwnerItem & { delivery?: Delivery; shipScope?: ShipScope }

/** The seller's side of "who can I ship to": per copy, meet-up / post, and — if posting — my country or anywhere. */
export function MyCopiesReach({ shirts, place }: { shirts: Readonly<Record<string, CollectorShirt>>; place: Place | null }) {
  const [items, setItems] = useState<Row[] | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const load = useCallback(() => {
    void closetMine().then((out) => {
      if (out.ok) setItems((out.items as Row[]).filter((i) => (i.state === 'held' || i.state === 'reserved') && (i.forSale || i.forTrade)))
      else setNote(errorLabel(out.error))
    })
  }, [])
  useEffect(load, [load])

  const patch = (id: string, change: Partial<Row>) => setItems((list) => list?.map((i) => (i.id === id ? { ...i, ...change } : i)) ?? null)
  const setDelivery = async (item: Row, delivery: Delivery) => {
    patch(item.id, { delivery })
    const out = await itemDeliverySet(item.id, delivery)
    setNote(out.ok ? h('hub.copies.changed') : errorLabel(out.error))
    if (!out.ok) load()
  }
  const setScope = async (item: Row, scope: ShipScope) => {
    patch(item.id, { shipScope: scope })
    const out = await itemReachSet(item.id, scope)
    setNote(out.ok ? h('hub.copies.changed') : errorLabel(out.error))
    if (!out.ok) load()
  }

  if (items === null) return null
  return (
    <section aria-label={h('hub.copies.title')} className="mt-stack border-rule border-ink bg-sheet p-3">
      <Kicker>{h('hub.copies.title')}</Kicker>
      <p className="mt-1 max-w-prose font-body text-[12.5px] leading-snug text-muted">{h('hub.copies.lede')}</p>
      {items.length === 0 ? (
        <p className="mt-2 font-body text-step--1 text-ink">{h('hub.copies.none')}</p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {items.map((item) => {
            const shirt = shirts[item.archiveSlug]
            const delivery = item.delivery ?? 'both'
            const scope = item.shipScope ?? 'country'
            return (
              <li key={item.id} className="border-hair border-ink/30 bg-paper p-2">
                <p className="truncate font-body text-[13px] font-extrabold text-ink">{shirt ? shirtName(shirt) : item.archiveSlug}</p>
                <div className="mt-1 flex flex-wrap gap-1" role="group" aria-label={h('hub.rail.delivery')}>
                  <Chip on={delivery === 'both'} onClick={() => void setDelivery(item, 'both')} label={h('hub.delivery.both')} />
                  <Chip on={delivery === 'ship'} onClick={() => void setDelivery(item, 'ship')} label={h('hub.delivery.ship')} />
                  <Chip on={delivery === 'local'} onClick={() => void setDelivery(item, 'local')} label={h('hub.delivery.local')} />
                </div>
                {delivery !== 'local' ? (
                  <div className="mt-1 flex flex-wrap gap-1" role="group" aria-label={h('hub.copies.title')}>
                    <Chip on={scope === 'country'} onClick={() => void setScope(item, 'country')} label={h('hub.copies.country')} disabled={!place?.show} />
                    <Chip on={scope === 'world'} onClick={() => void setScope(item, 'world')} label={h('hub.copies.world')} />
                  </div>
                ) : (
                  <p className="mt-1 font-body text-[11.5px] text-muted">{h('hub.copies.shipNo')}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {note ? <p className="mt-2 font-body text-[12.5px] font-extrabold text-ink" role="status">{note}</p> : null}
    </section>
  )
}
