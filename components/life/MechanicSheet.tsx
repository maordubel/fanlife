'use client'

import dynamic from 'next/dynamic'
import { useState, type ComponentType } from 'react'

import { SheetHead } from '@/components/life/Plate'
import { useDialog } from '@/components/ui/useDialog'
import { t, type MessageKey } from '@/lib/i18n'
import type { ActivityKind, MechanicRequest } from '@/lib/life/activities'
import type { ActivityQuote, OfferKind } from '@/lib/life/offers'
import type { ActivityResult } from '@/lib/mechanics/types'

/**
 * המשחק, בתוך החדר — the gate's own board, over a paused room (21.9.2026).
 *
 * Maor: *"השחקן לא ירגיש שהוא יוצא מ־LIFE כדי לשחק Gate."* So nothing navigates. The room
 * stops (`runtime.pause`), this sheet rises over it in the life's own chrome — the sign
 * plate, the host's name, the one sentence of why — and the body is the gate's board with
 * its `embedded` prop: the same deal, the same grade, the same pieces, and none of the
 * site's furniture (no share row, no "again", nothing written to the gate's records). When
 * the board hands its verdict back, the shell settles it (`useLifeLedger.settleActivity`)
 * and the room answers in a person's voice. ✕ is walking away: nothing paid, a third of the
 * time gone, and the person says so too.
 *
 * Each board is loaded when it is opened (`next/dynamic`): a boy who never goes to the
 * café never downloads the locker room.
 */

export type ActivityBoardProps = {
  request: MechanicRequest
  onResult: (result: ActivityResult) => void
}

/** a board, loaded when first opened — never in the bundle of a life that never asks for it */
function lazyBoard(load: () => Promise<{ default: ComponentType<ActivityBoardProps> }>) {
  return dynamic(load, {
    ssr: false,
    loading: () => <p className="mt-6 font-body text-[13px] text-muted">{t('life.act.loading')}</p>,
  })
}

/** the life's wrapper for each mechanic — each deals through `app/life/mechanicActions.ts` and embeds the gate's board */
const BOARDS: Partial<Record<ActivityKind, ComponentType<ActivityBoardProps>>> = {
  goalReconstruction: lazyBoard(() => import('./mechanics/LifeGoal')),
  shirtDesigner: lazyBoard(() => import('./mechanics/LifeKit')),
  memoryChallenge: lazyBoard(() => import('./mechanics/LifeMemory')),
  hateHistory: lazyBoard(() => import('./mechanics/LifeWall')),
  royalRumble: lazyBoard(() => import('./mechanics/LifeRumble')),
  route: lazyBoard(() => import('./mechanics/LifePapers')),
  lineupQuiz: lazyBoard(() => import('./mechanics/LifeLineup')),
  poll: lazyBoard(() => import('./mechanics/LifePoll')),
  allTimeXI: lazyBoard(() => import('./mechanics/LifeXI')),
  archive: lazyBoard(() => import('./mechanics/LifeArchive')),
  supporterCraft: lazyBoard(() => import('./mechanics/LifeCraft')),
}

/** the one button of the pre-launch card, in the verb of what it is */
const START_KEY: Record<OfferKind, MessageKey> = {
  work: 'life90b.offer.start.work',
  wager: 'life90b.offer.start.wager',
  play: 'life90b.offer.start.play',
  favour: 'life90b.offer.start.favour',
}

export function MechanicSheet({
  request,
  quote,
  onDone,
  onDecline,
}: {
  request: MechanicRequest
  /**
   * כרטיס לפני היציאה (§22.6) — what this is (עבודה / התערבות / משחק / טובה), roughly how
   * long, what it pays and how tiring it is, BEFORE the gate's board takes the screen. With
   * no quote the board opens at once, as it always did.
   */
  quote?: ActivityQuote
  onDone: (result: ActivityResult) => void
  /** "לא עכשיו" on the card: nothing started, so nothing is settled — not even the third of the time */
  onDecline?: () => void
}) {
  const [started, setStarted] = useState(!quote)
  const leave = () => onDone({ completed: false, score: 0 })
  const decline = onDecline ?? leave
  const ref = useDialog<HTMLDivElement>(started ? leave : decline)
  const Board = BOARDS[request.kind] ?? null
  const ask = `life.act.${request.activity}.ask` as MessageKey
  const askText = t(ask, { crowd1: request.crowd[0] ?? '', crowd2: request.crowd[1] ?? request.crowd[0] ?? '' })

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={request.titleHe}
      tabIndex={-1}
      dir="rtl"
      className="fixed inset-0 z-[60] flex flex-col bg-paper text-ink outline-none"
      data-life="mechanic"
      data-activity={request.activity}
      data-started={started ? '1' : '0'}
    >
      <SheetHead
        title={request.titleHe}
        kicker={quote ? `${quote.kindHe} · ${request.hostHe}` : request.hostHe}
        onClose={started ? leave : decline}
        closeLabel={started ? t('life.act.leave') : t('life90b.offer.later')}
      />
      {!started && quote ? (
        <div className="flex min-h-0 flex-1 flex-col" data-life="activity-card" data-kind={quote.kind}>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-gutter">
            <div className="mx-auto w-full max-w-[520px] animate-fx-pop">
              <p className="mt-4 inline-block bg-ink px-2 py-0.5 font-sign text-[13px] text-sheet">{quote.kindHe}</p>
              <p className="mt-2 font-display text-[22px] leading-tight text-ink">
                <bdi>{request.titleHe}</bdi>
              </p>
              <p className="mt-3 border-s-rule border-red ps-3 font-body text-[15px] leading-snug text-ink" data-life="mechanic-ask">
                {askText}
              </p>
              <p className="mt-2 font-body text-[13px] leading-snug text-muted">
                <bdi>{quote.noteHe}</bdi>
              </p>
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t-hair border-ink pt-3 font-body text-[14px] text-ink">
                {quote.minutes > 0 && (
                  <>
                    <dt className="font-sign text-muted">{t('life90b.offer.time')}</dt>
                    <dd>
                      <bdi>{t('life90b.offer.minutes', { n: String(quote.minutes) })}</bdi>
                    </dd>
                  </>
                )}
                <dt className="font-sign text-muted">{t('life90b.offer.pay')}</dt>
                <dd data-life="activity-pay">
                  <bdi>{quote.payHe}</bdi>
                </dd>
                <dt className="font-sign text-muted">{t('life90b.offer.energy')}</dt>
                <dd>
                  <bdi>{quote.energyHe}</bdi>
                </dd>
              </dl>
            </div>
          </div>
          <div className="flex gap-2 border-t-rule border-ink bg-sheet px-gutter pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
            <button
              type="button"
              onClick={() => setStarted(true)}
              data-life="activity-start"
              className="flex min-h-tap flex-1 items-center justify-center bg-red px-4 font-sign text-[16px] text-sheet active:bg-sign"
            >
              {t(START_KEY[quote.kind])}
            </button>
            <button
              type="button"
              onClick={decline}
              data-life="activity-later"
              className="flex min-h-tap items-center justify-center border-rule border-ink px-4 font-sign text-[15px] text-ink active:bg-ink active:text-sheet"
            >
              {t('life90b.offer.later')}
            </button>
          </div>
        </div>
      ) : (
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-gutter pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <div className="mx-auto w-full max-w-[960px]">
        <p className="mt-3 border-s-rule border-red ps-3 font-body text-[14px] leading-snug text-ink" data-life="mechanic-ask">
          {askText}
        </p>
        {Board ? (
          <Board request={request} onResult={onDone} />
        ) : (
          <button
            type="button"
            onClick={leave}
            className="mt-6 flex min-h-tap w-full items-center justify-center border-rule border-ink bg-sheet px-4 font-body text-step-0 font-extrabold text-ink"
          >
            {t('life.act.leave')}
          </button>
        )}
        </div>
      </div>
      )}
    </div>
  )
}
