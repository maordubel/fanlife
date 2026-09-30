'use client'

import { Marks } from '@/components/life/BagShelf'
import { t } from '@/lib/i18n'
import type { SubscriptionCard } from '@/lib/life/personal'
import type { PurseId, PurseReading, SubscriptionReading } from '@/lib/life/profile'

import { SubscriptionCardObject } from './PhysicalObject'
import css from './personal.module.css'

/**
 * כסף ומנויים — two pockets in words, and a season card as a card (spec §28–29).
 *
 * The money is what `purseReading` has always said: the pocket against the turnstile of
 * that decade, the tin under the bed against the shirt on the rail — a sentence, never a
 * figure (rule 46; the figures live on `GaugesSheet`, which answers "כמה"). The
 * subscription is `subscriptionReading` — the lead's model, untouched — drawn as the
 * object it is, with the run said as a sentence and drawn as marks, never printed.
 */
const purseLabel = (purse: PurseId): string => (purse === 'pocket' ? t('life.bag.pocket') : t('life.bag.tin'))

export function MoneyAndSubscriptions({
  purses,
  subscription,
  card,
}: {
  purses: PurseReading[]
  subscription: SubscriptionReading | null | undefined
  card: SubscriptionCard | null
}) {
  return (
    <div className={`${css.drawer} min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(16px,env(safe-area-inset-bottom))] md:px-6`} data-life="bag-money">
      <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-10">
        <section>
          <p className="font-body text-[12px] leading-snug text-concrete/80">
            <bdi>{t('life.bag.moneyNote')}</bdi>
          </p>
          <dl className="mt-3 flex flex-col">
            {purses.map((purse) => (
              <div key={purse.purse} className="border-t-hair border-concrete/25 py-3">
                <dt className="font-mono tabular-nums text-[10px] uppercase tracking-[0.16em] text-concrete">
                  <bdi>{purseLabel(purse.purse)}</bdi>
                </dt>
                <dd className="mt-1.5 flex items-center gap-2.5">
                  <p className={`font-display text-[22px] leading-none ${purse.band === 0 ? 'text-concrete' : 'text-sheet'}`}>
                    <bdi>{purse.readingHe}</bdi>
                  </p>
                  <Marks n={purse.band} />
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h3 className="font-mono tabular-nums text-[10px] uppercase tracking-[0.16em] text-concrete">
            <bdi>{t('life.bag.sub')}</bdi>
          </h3>
          {card ? (
            <div className="mt-3 flex flex-col items-start gap-3">
              <SubscriptionCardObject card={card} id={`sub:${card.seasonHe}`} />
              {subscription && subscription.streak > 0 ? (
                <div className="flex items-center gap-2">
                  <Marks n={Math.min(subscription.streak, 12)} />
                  <p className="font-body text-[12px] leading-none text-sheet/85">
                    <bdi>{card.runHe ?? t('life.bag.subRun')}</bdi>
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 font-body text-[13px] leading-relaxed text-concrete">
              <bdi>{t('life90h.bag.subNone')}</bdi>
            </p>
          )}
          {subscription && subscription.seasonsHe.length > 1 ? (
            <p className="mt-3 font-mono tabular-nums text-[10px] leading-relaxed text-concrete" dir="ltr">
              {subscription.seasonsHe.join(' · ')}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  )
}
