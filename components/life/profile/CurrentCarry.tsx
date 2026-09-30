'use client'

import { useState } from 'react'

import { Marks } from '@/components/life/BagShelf'
import { t } from '@/lib/i18n'
import type { SubscriptionCard } from '@/lib/life/personal'
import type { CarriedReading } from '@/lib/life/profile'

import { CarriedObject, SubscriptionCardObject } from './PhysicalObject'
import css from './personal.module.css'

/**
 * עליי עכשיו — what he is holding this afternoon, tipped out on the table (spec §19).
 *
 * Physical things only, drawn as the things: the photographed stub, the painted coin, a
 * key on its string, a bottle for the deposit. Three bottles are three bottles (`copies`,
 * drawn and never printed). The season card rides here too when there is one in his
 * pocket — it is the most literal answer there is to "what is on me".
 *
 * Tap one: it is lifted off the table, the others wait, and its sentence is read under it.
 * Everything here is gone by morning (rule 68) and the sentence under the table says so.
 */
export function CurrentCarry({ carried, card }: { carried: CarriedReading[]; card: SubscriptionCard | null }) {
  const [picked, setPicked] = useState<string | null>(null)
  const chosen = carried.find((thing) => thing.item === picked) ?? null
  const cardPicked = picked === 'card'

  if (carried.length === 0 && !card) {
    return (
      <div className="flex min-h-0 flex-1 items-center px-6" data-life="bag-carry">
        <p className="font-body text-[14px] leading-relaxed text-concrete">
          <bdi>{t('life.bag.carriedNone')}</bdi>
        </p>
      </div>
    )
  }

  return (
    <div className={`${css.drawer} flex min-h-0 flex-1 flex-col px-4 pb-[max(12px,env(safe-area-inset-bottom))] md:px-6`} data-life="bag-carry">
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain border-hair border-concrete/30 bg-sheet/[0.03] p-4">
        <ul className="flex min-h-full flex-wrap content-center items-center justify-center gap-x-5 gap-y-6">
          {carried.map((thing, i) => (
            <li key={thing.item} className={`${css.liftable} ${picked === thing.item ? css.lifted : picked ? css.lowered : ''}`}>
              <button
                type="button"
                data-life="carry-thing"
                aria-pressed={picked === thing.item}
                onClick={() => setPicked(picked === thing.item ? null : thing.item)}
                className="flex min-h-tap min-w-tap items-center"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="relative flex">
                  {Array.from({ length: Math.min(Math.max(1, thing.copies), 4) }, (_, copy) => (
                    <span key={copy} className={copy > 0 ? '-ms-8' : ''}>
                      <CarriedObject id={`${thing.item}:${copy}`} item={thing.item} art={thing.art} label={copy === 0 ? thing.nameHe : ''} />
                    </span>
                  ))}
                </span>
              </button>
            </li>
          ))}
          {card ? (
            <li className={`${css.liftable} ${cardPicked ? css.lifted : picked ? css.lowered : ''}`}>
              <button type="button" aria-pressed={cardPicked} onClick={() => setPicked(cardPicked ? null : 'card')} className="flex min-h-tap items-center" data-life="carry-card">
                <SubscriptionCardObject card={card} id={`sub:${card.seasonHe}`} compact />
              </button>
            </li>
          ) : null}
        </ul>
      </div>
      <div className="min-h-[76px] shrink-0 pt-2.5" aria-live="polite">
        {chosen ? (
          <div key={chosen.item} className={css.drawer}>
            <p className="font-display text-[17px] leading-none text-sheet">
              <bdi>{chosen.nameHe}</bdi>
            </p>
            <p className="mt-1.5 font-body text-[13px] leading-snug text-concrete">
              <bdi>{chosen.noteHe}</bdi>
            </p>
            {chosen.copies > 1 ? (
              <div className="mt-1.5 flex">
                <Marks n={chosen.copies} moreHe={chosen.more ? t('life.bag.carriedMore') : null} />
              </div>
            ) : null}
          </div>
        ) : cardPicked && card ? (
          <div className={css.drawer}>
            <p className="font-display text-[17px] leading-none text-sheet">
              <bdi>
                {t('life.bag.subCurrent')} · {card.seasonHe}
              </bdi>
            </p>
            {card.runHe ? (
              <p className="mt-1.5 font-body text-[13px] leading-snug text-concrete">
                <bdi>{card.runHe}</bdi>
              </p>
            ) : null}
          </div>
        ) : (
          <p className="font-body text-[12px] leading-relaxed text-concrete/80">
            <bdi>{t('life.bag.carriedNote')}</bdi>
          </p>
        )}
      </div>
    </div>
  )
}
