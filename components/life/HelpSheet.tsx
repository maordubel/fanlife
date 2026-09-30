'use client'

import { useState } from 'react'

import { Cloth, SheetHead } from '@/components/life/Plate'
import { useDialog } from '@/components/ui/useDialog'
import { t } from '@/lib/i18n'
import type { ChecklistItem } from '@/lib/life/checklist'
import { HELP_DISCLAIMER_HE, HELP_RULES_HE, HELP_STORY_HE } from '@/lib/life/help'
import type { OfferKind } from '@/lib/life/offers'

/** one row of "אפשר עכשיו" — already in words (`offerLineHe`), with its kind for the chip */
export type HelpOffer = { id: string; kind: OfferKind; kindHe: string; lineHe: string; here: boolean }

const KIND_TONE: Record<OfferKind, string> = {
  work: 'bg-red text-sheet',
  wager: 'bg-sign text-sheet',
  play: 'border-hair border-ink text-ink',
  favour: 'border-hair border-sign text-sign',
}

/**
 * "מה עליי לעשות?" — the sheet behind the question mark.
 *
 * Two things, in this order: the answer (the day's shape on the red cloth, then one plain
 * sentence that says where to be), and — folded, under a tab — the story, the rules and
 * the disclaimer. The answer is the point; the rest is there for the person who wants
 * to know what kind of thing this is before they trust it with an evening.
 */
export function HelpSheet({
  objective,
  hint,
  waitingOn = null,
  checklist = [],
  offers = [],
  capHe = null,
  onClose,
}: {
  objective: string | null
  hint: string
  /** what the DAY is waiting for, when the room itself has nothing left to offer */
  waitingOn?: string | null
  /** the day's steps, discovered so far — see `lib/life/checklist.ts` */
  checklist?: ChecklistItem[]
  /**
   * אפשר עכשיו (§22.4.3) — today's offers this life can actually start, read off the world
   * by `lib/life/offers.ts`. Work, a bet, a game or a favour, each named as what it is,
   * with the place and roughly how long. Never a job the room does not have.
   */
  offers?: HelpOffer[]
  /** the pay cap, said once it bites — the anti-grind rule is a sentence, not a hiding place */
  capHe?: string | null
  onClose: () => void
}) {
  const [more, setMore] = useState(false)
  const dialogRef = useDialog<HTMLDivElement>(onClose)
  return (
    <div
      className="absolute inset-0 z-40 flex items-end justify-center bg-ink/70 p-2.5 pb-[max(10px,env(safe-area-inset-bottom))] sm:items-center"
      data-life="help"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-[60] flex max-h-full w-full max-w-[420px] animate-sheet-in flex-col border-rule border-ink bg-sheet outline-none"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={t('life.help.title')}
      >
        <SheetHead title={t('life.help.title')} onClose={onClose} closeLabel={t('life.help.close')} />

        <div className="overflow-y-auto">
          <div className="px-3 pt-3" data-life="help-now">
            <p className="mb-1.5 font-display text-[11px] uppercase tracking-[0.18em] text-red">{t('life90b.offer.main')}</p>
            {objective && (
              <Cloth className="max-w-full">
                <span>
                  <bdi>{objective}</bdi>
                </span>
              </Cloth>
            )}
            <p className="mt-3 font-body text-[15px] leading-snug text-ink" data-life="help-hint">
              <bdi>{hint}</bdi>
            </p>
            {checklist.length > 0 && (
              <ol className="mt-3 list-none border-t-hair border-ink pt-2" data-life="checklist">
                {checklist.map((item) => (
                  <li
                    key={item.id}
                    className={`flex items-start gap-2 py-1 font-body text-[14px] leading-snug ${item.done ? 'text-muted line-through' : 'text-ink'}`}
                    data-life="checklist-step"
                    data-done={item.done ? '1' : '0'}
                  >
                    <span className={`mt-[3px] inline-block h-[12px] w-[12px] shrink-0 border-hair border-ink ${item.done ? 'bg-red' : 'bg-sheet'}`} aria-hidden="true" />
                    <bdi>{item.textHe}</bdi>
                  </li>
                ))}
              </ol>
            )}

            {(offers.length > 0 || capHe) && (
              <section className="mt-3 border-t-hair border-ink pt-2" data-life="help-offers" aria-label={t('life90b.offer.can')}>
                <p className="font-display text-[11px] uppercase tracking-[0.18em] text-red">{t('life90b.offer.can')}</p>
                <ul className="mt-1 list-none">
                  {offers.map((offer) => (
                    <li
                      key={offer.id}
                      className="flex items-start gap-2 py-1 font-body text-[14px] leading-snug text-ink"
                      data-life="help-offer"
                      data-kind={offer.kind}
                      data-here={offer.here ? '1' : '0'}
                    >
                      <span className={`mt-[1px] shrink-0 px-1.5 py-[1px] font-sign text-[11px] leading-tight ${KIND_TONE[offer.kind]}`}>
                        {offer.kindHe}
                      </span>
                      <bdi>{offer.lineHe}</bdi>
                    </li>
                  ))}
                </ul>
                {capHe && (
                  <p className="mt-1 font-body text-[12px] leading-snug text-muted" data-life="help-cap">
                    <bdi>{capHe}</bdi>
                  </p>
                )}
              </section>
            )}

            {/* ממתין — the sentence that says nothing is broken. A player who has done
                everything in the room and is standing still needs to know whether he is
                waiting for a clock or missing a thing, and those look identical from
                inside a room. */}
            {waitingOn && (
              <section className="mt-3 border-t-hair border-ink pt-2" data-life="help-time">
                <p className="font-display text-[11px] uppercase tracking-[0.18em] text-red">{t('life90b.offer.time')}</p>
                <p
                  className="mt-1 border-s-rule border-red ps-2 font-body text-[13px] leading-snug text-muted"
                  data-life="help-waiting"
                >
                  <bdi>{waitingOn}</bdi>
                </p>
              </section>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            className="mt-3 flex w-full min-h-tap items-center justify-between border-y-rule border-ink bg-paper px-3 text-start"
            aria-expanded={more}
            data-life="help-more"
          >
            <span className="font-sign text-[14px] leading-none text-ink">{t('life.help.more')}</span>
            <span className="font-mono tabular-nums text-[14px] leading-none text-ink" aria-hidden="true">
              {more ? '−' : '+'}
            </span>
          </button>

          {more && (
            <div className="px-3 pb-3" data-life="help-story">
              <p className="mt-3 border-b-hair border-ink pb-1 font-display text-[11px] uppercase tracking-[0.18em] text-red">{t('life.help.story')}</p>
              {HELP_STORY_HE.map((para) => (
                <p key={para.slice(0, 16)} className="mt-2 font-body text-[13px] leading-relaxed text-ink">
                  <bdi>{para}</bdi>
                </p>
              ))}
              <p className="mt-4 border-b-hair border-ink pb-1 font-display text-[11px] uppercase tracking-[0.18em] text-red">{t('life.help.rules')}</p>
              <ol className="mt-1 list-none">
                {HELP_RULES_HE.map((rule, index) => (
                  <li key={rule.slice(0, 16)} className="flex gap-2 py-1.5 font-body text-[13px] leading-snug text-ink">
                    <span className="shrink-0 font-poster text-[15px] leading-none text-red" dir="ltr">
                      {index + 1}
                    </span>
                    <bdi>{rule}</bdi>
                  </li>
                ))}
              </ol>
              <p className="mt-4 border-b-hair border-ink pb-1 font-display text-[11px] uppercase tracking-[0.18em] text-red">{t('life.help.disclaimer')}</p>
              <p className="mt-2 font-body text-[12px] leading-relaxed text-muted">
                <bdi>{HELP_DISCLAIMER_HE}</bdi>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
