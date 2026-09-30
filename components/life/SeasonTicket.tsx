'use client'

import { Marks } from '@/components/life/BagShelf'
import { useDialog } from '@/components/ui/useDialog'
import { t } from '@/lib/i18n'
import { formatMoney } from '@/lib/life/money'
import { shekels } from '@/lib/life/prices'
import type { LifeBusEvents } from '@/lib/life/runtime/bus'
import { holdsSeason, renewal, seasonFor, streakOf } from '@/lib/life/subscription'
import type { LifeState } from '@/lib/life/types'
import { SourceNote } from '@/components/ui/SourceNote'

/**
 * "המנוי יצא למכירה" — the card that stops a chapter, and the window that sells one.
 *
 * Maor, 16.9.2026, in one sentence: *"תכניס ממש עצירה בין לבין עם פופ אפ של 'המנוי יצא
 * למכירה'"*. The stop is the point. Everything else this game sells is something you find
 * — a rail you walk past, a kiosk you stop at, an envelope on a counter — and a season
 * ticket is the opposite: it goes on sale on a date, it comes off sale on a date, and
 * nobody tells you twice. A card that waits to be discovered would be a card nobody ever
 * bought, and a run of seasons is the one measure in the life that a single missed summer
 * ends.
 *
 * One component, two moments, because they are one object:
 * · `onSale` is the announcement — no button that spends anything, just the card, what it
 *   costs this year, and where the window is. It is fired on the first room of the chapter
 *   that opens the season.
 * · `counter` is the window in the ticket office, and is the only place the money moves.
 *
 * **What it prints, and why every line of it is quoted rather than computed.** Rule 16
 * says a fact carries its source onto the card the player reads. These prices are not a
 * decade table (`prices.ts`) — they are nine photographs of nine cards, so the card here
 * prints the season the way THAT card printed it (`90/91`, not `1990/91`), the category
 * that card names (`משולב אב ובן`, `ילד , נוער`, `חבר`), the gate off its own face, and
 * the source line under all of it. 1990/91 prints three numbers because the card does:
 * a price, a discount, and a payment.
 *
 * **There is no number for a season with no card.** `1992/93` and `1997/98` reach this
 * component with `price: null` and are never offered, so nothing here can render a figure
 * for them; `subscription.ts` holds the reason.
 *
 * **The run is DRAWN, not printed** — the same marks `ProfileCard` uses, for the same
 * reason (rule 46 / rule 63א). A price on a shop card is a price; a run rendered as a
 * figure is a score, and this game does not keep score of how good a supporter you are.
 * The word on it is **עונה אחרי עונה** — what a person actually says about a subscription
 * they never let lapse. Not the other word: `tests/life-story.test.ts` bans it from
 * content, and it bans it because it is the vocabulary of a leaderboard.
 *
 * **It holds no engine and dispatches nothing.** `onRenew` goes back to `LifeStage`,
 * exactly the way `ShopCard.onBuy` does — one till, in the shell, so the transaction
 * cannot exist in two places with two ideas of what it costs.
 */
export function SeasonTicket({
  card,
  state,
  onRenew,
  onClose,
}: {
  card: NonNullable<LifeBusEvents['season']>
  state: LifeState
  onRenew: () => void
  onClose: () => void
}) {
  const dialogRef = useDialog<HTMLDivElement>(onClose)
  const season = seasonFor(card.season)
  if (!season) return null

  const held = holdsSeason(state, season.id)
  const { fromPocket, covered } = renewal(season, state)
  const run = streakOf(state)
  const atCounter = card.kind === 'counter'

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      dir="rtl"
      data-life="season-ticket"
      className="absolute inset-0 z-[92] flex flex-col items-center justify-center bg-ink/95 px-5 py-6"
    >
      <div className="w-full max-w-[420px] border-rule border-sheet bg-sheet text-ink">
        <div className="border-b-hair border-ink/30 px-4 pb-3 pt-4 text-center">
          <p className="font-display text-[12px] uppercase tracking-[0.22em] text-red">
            <bdi>{atCounter ? t('life.sub.counter') : t('life.sub.onSale')}</bdi>
          </p>
          {/*
            The season as the CLUB printed it that year, which is not how the save spells
            it. Both are facts and they are different facts (see `Season.id`).
          */}
          <p className="mt-2 font-display text-[30px] leading-none tabular-nums">
            <bdi>{season.printedHe}</bdi>
          </p>
          <p className="mt-2 font-sign text-[13px] leading-none text-ink/80">
            <bdi>{season.categoryHe}</bdi>
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-b-hair border-ink/30 px-4 py-3 font-mono text-[12px] tabular-nums">
          {season.listPrice !== undefined && (
            <>
              <dt className="text-ink/60">
                <bdi>{t('life.sub.list')}</bdi>
              </dt>
              <dd className="text-end">
                <bdi>{formatMoney(shekels(season.listPrice))}</bdi>
              </dd>
            </>
          )}
          {season.discount !== undefined && (
            <>
              <dt className="text-ink/60">
                <bdi>{t('life.sub.discount')}</bdi>
              </dt>
              <dd className="text-end">
                <bdi>{formatMoney(shekels(season.discount))}</bdi>
              </dd>
            </>
          )}
          {season.price !== null && (
            <>
              {/*
                1990/91 prints three numbers — המחיר 150, הנחה 15, תשלום 135 — so the
                last row is what was PAID. Every other card prints one number and calls it
                the price; labelling that "תשלום" would invent a discount by implication.
              */}
              <dt className="font-sign text-[13px] text-ink">
                <bdi>{season.listPrice === undefined ? t('life.sub.list') : t('life.sub.paid')}</bdi>
              </dt>
              <dd className="text-end font-display text-[17px] leading-none">
                <bdi>{formatMoney(shekels(season.price))}</bdi>
              </dd>
            </>
          )}
          {season.gateHe && (
            <>
              <dt className="text-ink/60">
                <bdi>{t('life.sub.stand')}</bdi>
              </dt>
              <dd className="text-end">
                <bdi>{season.gateHe}</bdi>
              </dd>
            </>
          )}
        </dl>

        <p className="border-b-hair border-ink/30 px-4 py-3 font-body text-[13px] leading-relaxed text-ink/80">
          <bdi>{season.noteHe}</bdi>
        </p>

        {/* Rule 16 — the card still says the row has a source; which one is on /credits,
            the only page that prints sources (spec §0.3, 22.9.2026). */}
        {season.sourceHe && (
          <p className="border-b-hair border-ink/30 px-4 py-1">
            <SourceNote newTab />
          </p>
        )}

        <div className="px-4 py-4">
          {held ? (
            <>
              <p className="font-display text-[16px] leading-none text-red">
                <bdi>{t('life.sub.yours')}</bdi>
              </p>
              {run > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <Marks n={Math.min(run, 12)} />
                  <p className="font-body text-[11px] leading-none text-ink/60">
                    <bdi>{t('life.sub.run')}</bdi>
                  </p>
                </div>
              )}
            </>
          ) : atCounter ? (
            <>
              {/*
                מה יוצא מהכיס שלו — and the rest, said out loud rather than hidden.
                `renewal()` carries the whole argument for why this is not the full price:
                every printed price in the set is above the money the game can produce by
                the chapter that sells it, and the cards themselves say who the second
                name on them is.
              */}
              <dl className="grid grid-cols-2 gap-y-1 font-mono text-[12px] tabular-nums">
                <dt className="text-ink/60">
                  <bdi>{t('life.sub.pocket')}</bdi>
                </dt>
                <dd className="text-end">
                  <bdi>{formatMoney(fromPocket)}</bdi>
                </dd>
              </dl>
              {covered > 0 && (
                <p className="mt-2 font-body text-[13px] leading-relaxed text-ink/70">
                  <bdi>
                    {season.category === 'fatherAndSon' ? t('life.sub.coveredPair') : t('life.sub.coveredHome')}
                  </bdi>
                </p>
              )}
              <button
                type="button"
                onClick={onRenew}
                className="min-h-tap mt-4 w-full border-rule border-red bg-red px-4 py-3 font-display text-[16px] leading-none text-sheet transition-transform duration-press ease-stamp active:scale-[.99] motion-reduce:transition-none"
              >
                <bdi>{t('life.sub.renew')}</bdi>
              </button>
            </>
          ) : (
            <p className="font-body text-[13px] leading-relaxed text-ink/80">
              <bdi>{t('life.sub.where')}</bdi>
            </p>
          )}

          {/*
            Leaving is always allowed (rule 42). Escape does the same thing, through
            `useDialog`, and closing applies nothing at all — the window is still open
            tomorrow, which is the whole difference between a decision and a trap.
          */}
          <button
            type="button"
            onClick={onClose}
            className="min-h-tap mt-3 w-full px-4 py-2 font-body text-[13px] text-ink/60 underline underline-offset-4"
          >
            <bdi>{held || !atCounter ? t('life.sub.go') : t('life.sub.later')}</bdi>
          </button>
        </div>
      </div>
    </div>
  )
}
