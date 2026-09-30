'use client'

import Link from 'next/link'
import { useState } from 'react'

import { DonationCard } from '@/components/collector/DonationCard'
import { MatchShare } from '@/components/collector/MatchShare'
import { dealOutcome, donationAllowed, shirtName } from '@/lib/collector/market'
import type { CollectorShirt, Thread } from '@/lib/collector/types'
import { t } from '@/lib/i18n'

import { ArchivePhoto, ShirtDate } from './ShirtBits'

type Panel = 'share' | 'closet' | 'donate'

/**
 * ✓ העסקה הושלמה (מפרט §49, §59–§60). "עוד חולצה מצאה בית אדום." — and four things to do with it:
 * share the deal, update the closet (the buyer is ASKED "להוסיף לארון שלי?"; the seller's copy is
 * already marked sold by the database), give, or close.
 *
 * **This component is the only door to the donation card in the market, and the door is
 * `donationAllowed(status)`** — a deal both sides marked complete. Not during a negotiation, not
 * after an agreement, never as a condition (§51, §55); the card is behind a tap, not in the way,
 * and nothing it does reaches anything else in the product (§54).
 */
export function DealSuccess({
  thread,
  shirts,
  onAdd,
}: {
  thread: Pick<Thread, 'connection' | 'item' | 'offers'>
  shirts: Readonly<Record<string, CollectorShirt>>
  /** `have(slug, kitId, true)` — resolves true when the copy is in the closet */
  onAdd: (slug: string, kitId: string | null) => Promise<boolean>
}) {
  const [panel, setPanel] = useState<Panel | null>('closet')
  const [closed, setClosed] = useState(false)
  const [added, setAdded] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState<string | null>(null)

  if (!donationAllowed(thread.connection.status)) return null
  const outcome = dealOutcome(thread)
  if (!outcome) return null

  if (closed) {
    return (
      <button
        type="button"
        onClick={() => setClosed(false)}
        className="flex min-h-tap w-full items-center justify-center border-rule border-red bg-paper font-body text-step--1 font-extrabold text-red"
      >
        {t('market.success.reopen')}
      </button>
    )
  }

  const mine = outcome.mine ? (shirts[outcome.mine] ?? null) : null
  const theirs = outcome.theirs ? (shirts[outcome.theirs] ?? null) : null
  const add = async (slug: string, kitId: string | null) => {
    setBusy(slug)
    const ok = await onAdd(slug, kitId)
    setBusy(null)
    if (ok) setAdded((rows) => new Set(rows).add(slug))
  }
  const tabs: { key: Panel | 'close'; label: string }[] = [
    { key: 'share', label: t('market.success.share') },
    { key: 'closet', label: t('market.success.closet') },
    { key: 'donate', label: t('market.success.donate') },
    { key: 'close', label: t('market.success.close') },
  ]

  return (
    <section aria-labelledby="deal-success" className="border-plate border-red bg-paper" data-deal-success="">
      <div className="bg-red px-4 py-4 text-paper">
        <h2 id="deal-success" className="font-display text-step-4 leading-none">
          {t('market.success.title')}
        </h2>
        <p className="mt-2 font-display text-step-1 leading-tight">{t('market.success.line')}</p>
      </div>

      {mine ? (
        <div className="flex items-center justify-center gap-3 border-b-rule border-ink px-3 py-3">
          <Hanger shirt={mine} />
          {theirs ? (
            <>
              <span aria-hidden="true" className="font-poster text-[40px] leading-none text-red">
                ⇄
              </span>
              <Hanger shirt={theirs} />
            </>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 border-b-hair border-ink/30 sm:grid-cols-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-pressed={tab.key !== 'close' ? panel === tab.key : undefined}
            onClick={() => (tab.key === 'close' ? setClosed(true) : setPanel(panel === tab.key ? null : tab.key))}
            className={`min-h-tap border-b-hair border-e-hair border-ink/30 px-1 font-body text-[13px] font-extrabold sm:border-b-0 sm:last:border-e-0 ${
              tab.key !== 'close' && panel === tab.key ? 'bg-ink text-paper' : 'bg-paper text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-3">
        {panel === 'share' && outcome.mine ? <MatchShare kind={outcome.kind} mine={outcome.mine} theirs={outcome.theirs} /> : null}

        {panel === 'closet' ? (
          <div className="flex flex-col gap-2" data-deal-closet={outcome.role}>
            {outcome.role === 'seller' ? <p className="font-body text-step--1 text-ink">{t('market.success.sold')}</p> : null}
            {outcome.role === 'trader' ? <p className="font-body text-step--1 text-ink">{t('market.success.traded')}</p> : null}
            {outcome.received.length > 0 ? (
              <>
                <p className="font-display text-step-1 leading-tight text-ink">
                  {outcome.role === 'buyer' ? t('market.success.addBuy') : t('market.success.addTrade')}
                </p>
                <ul className="flex flex-col gap-2">
                  {outcome.received.map((row) => {
                    const shirt = shirts[row.slug]
                    const done = added.has(row.slug)
                    return (
                      <li key={row.slug} className="flex items-center gap-3 border-rule border-ink bg-sheet p-2">
                        <span className="block w-[56px] shrink-0">{shirt ? <ArchivePhoto shirt={shirt} /> : null}</span>
                        <span className="min-w-0 flex-1 font-body text-[12.5px] font-extrabold text-ink">{shirtName(shirt)}</span>
                        {done ? (
                          <span role="status" className="font-body text-[12px] font-extrabold text-sign">
                            ✓ {t('market.success.added')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={busy === row.slug}
                            onClick={() => void add(row.slug, row.kitId)}
                            className="min-h-tap shrink-0 border-rule border-ink bg-red px-3 font-body text-[12.5px] font-extrabold text-paper disabled:opacity-60"
                          >
                            {t('market.success.add')}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </>
            ) : outcome.role === 'trader' ? (
              <p className="font-body text-[12.5px] leading-snug text-muted">{t('market.success.nothing')}</p>
            ) : null}
            <Link href="/kits/closet" className="inline-flex min-h-tap items-center self-start font-body text-step--1 font-extrabold text-sign underline underline-offset-4">
              {t('market.toCloset')}
            </Link>
          </div>
        ) : null}

        {panel === 'donate' ? <DonationCard dealKey={thread.connection.id} /> : null}
      </div>
    </section>
  )
}

function Hanger({ shirt }: { shirt: CollectorShirt }) {
  return (
    <figure className="w-[104px] text-center">
      <span className="block border-hair border-ink/40 bg-sheet p-1">
        <ArchivePhoto shirt={shirt} />
      </span>
      <figcaption className="mt-1 font-poster text-[18px] leading-none text-ink">
        <ShirtDate shirt={shirt} />
      </figcaption>
    </figure>
  )
}
