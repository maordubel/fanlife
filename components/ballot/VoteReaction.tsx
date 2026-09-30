'use client'

import { KitShirt } from '@/components/kit/KitShirt'
import { RevealBar, useReveal } from '@/components/play/Reveal'
import { Num } from '@/components/ui/Num'
import { SourceNote } from '@/components/ui/SourceNote'
import { useDialog } from '@/components/ui/useDialog'
import { BALLOT, type PollQuestion } from '@/lib/polls/ballot'
import { factIsEmpty, spanOf, type PickFact } from '@/lib/polls/pickFact'
import { reasonsFor } from '@/lib/polls/reasons'
import { WORN_SHOWN, type WornRow } from '@/lib/polls/wore'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * How long the beat holds before it moves on — skippable and cancellable either way.
 * 2600ms when there is an archive row to READ (a man's facts, the men who wore a number),
 * about 1500ms when there is only the stamp (players.md §2, Gate 7 "advance timing").
 */
export const ADVANCE_MS = 2600
export const ADVANCE_MS_BARE = 1500

/**
 * מה שקורה אחרי שבחרת — the beat the reference calls the vote reaction.
 *
 * Three things happen in it and the order is the point: the pick is CONFIRMED, the
 * archive says what little it knows about the man, and the "why" chips are offered. Then
 * it moves on by itself, because a form that makes you press "next" after every answer
 * is a form and this is meant to be an argument.
 *
 * **What it deliberately does not do is invent a terrace.** See `lib/polls/pickFact.ts`
 * for the whole argument — in short, a crowd line in quotation marks is a claim about
 * what supporters think with no count behind it, which is the same thing the hundred-
 * ballot rule exists to stop, written as speech instead of as a percentage. The panel
 * that would have held it holds sourced archive rows, or one sentence saying there are
 * none.
 *
 * **Auto-advance, and the three ways out of it.** `useReveal` — the same beat gate 6's
 * fusion plate runs on — gives the guarantees the brief asks for by name: it ends on its
 * own, a tap on the scrim ends it NOW, "שיניתי את דעתי" CANCELS it and reopens the
 * picker on the same question, and Escape dismisses it back to the slip having advanced
 * nothing. Nothing here is a wait you cannot leave, and no way out of it answers a
 * question for you.
 *
 * `2600ms` when the panel has something to READ (the archive's rows on the man, or the
 * men who wore the number), `1500ms` when it holds only the stamp — close to the
 * reference's 1450. The cancel button is what makes either length safe.
 */
export function VoteReaction({
  question,
  pick,
  fact,
  worn = [],
  chosen,
  filled,
  last,
  onReason,
  onRethink,
  onClose,
  onDone,
}: {
  question: PollQuestion
  /** the pick as it is printed — a name, a number, a position's label */
  pick: string
  /** what the archive holds on this pick — null for a number, a position, or an unknown name */
  fact: PickFact | null
  /** for the number: who wore it, season-bound, each row pointing at its source */
  worn?: readonly WornRow[]
  chosen: MessageKey | undefined
  filled: number
  /** true when this was the last empty row: the beat returns to the slip, not to a question */
  last: boolean
  onReason: (reason: MessageKey) => void
  onRethink: () => void
  /** Escape — close the beat and go back to the slip, advancing nothing */
  onClose: () => void
  onDone: () => void
}) {
  const hasArchive = (fact !== null && !factIsEmpty(fact)) || worn.length > 0
  const { progress, skip, cancel } = useReveal({ ms: hasArchive ? ADVANCE_MS : ADVANCE_MS_BARE, onDone, active: true })
  // Escape is the dialog contract — it DISMISSES. It does not advance, because a key
  // that means "get me out of here" should not also answer the next question.
  const dialogRef = useDialog<HTMLDivElement>(() => {
    cancel()
    onClose()
  })
  const chips = reasonsFor(question.id)
  const span = fact ? spanOf(fact) : null

  function rethink() {
    cancel()
    onRethink()
  }

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={t('poll.reaction.title')}
      className="fixed inset-0 z-[60] flex flex-col justify-end bg-ink/70 outline-none"
    >
      <button type="button" aria-label={t('poll.reaction.close')} className="flex-1" onClick={skip} />

      <div className="max-h-[86vh] animate-slam overflow-y-auto border-t-rule border-ink bg-sheet">
        <RevealBar progress={progress} />

        {/* what was just recorded */}
        <div className="flex items-start gap-3 px-4 pt-3">
          <span
            aria-hidden="true"
            className="mt-0.5 shrink-0 animate-stamp-in border-plate border-red px-2 py-0.5 font-poster text-[17px] leading-none text-red"
          >
            {t('poll.reaction.stamp')}
          </span>
          <div className="min-w-0">
            <p dir="ltr" className="font-latin text-[8.5px] font-bold tracking-[0.16em] text-muted">
              {question.latin}
            </p>
            <p className="mt-0.5 truncate font-display text-step-2 leading-tight text-ink">{pick}</p>
            <p className="mt-0.5 font-body text-[11px] text-muted">
              {t('poll.reaction.progress', { n: String(filled), total: String(BALLOT.length) })}
            </p>
          </div>
        </div>

        {/* what the archive holds on him — sourced rows, or one honest sentence */}
        {fact !== null && (
          <div className="mx-4 mt-3 border-hair border-ink/30 bg-paper p-2.5">
            <p className="font-body text-[8.5px] font-extrabold tracking-[0.18em] text-red">
              {t('poll.fact.title')}
            </p>
            {factIsEmpty(fact) ? (
              <p className="mt-1 font-body text-[11.5px] leading-snug text-muted">
                {t('poll.fact.silent')}
              </p>
            ) : (
              <div className="mt-1.5 flex items-start gap-3">
                {fact.spec && (
                  <KitShirt
                    spec={fact.spec}
                    density="mini"
                    className="h-14 w-12 shrink-0"
                    title={t('poll.fact.shirt', { season: fact.seasonLabel ?? '' })}
                  />
                )}
                <dl className="min-w-0 flex-1">
                  {span !== null && (
                    <div className="flex items-baseline gap-2">
                      <dt className="font-body text-[10px] font-extrabold text-muted">
                        {t('poll.fact.squad')}
                      </dt>
                      <dd className="font-mono text-[12px] tabular-nums text-ink">
                        <Num>{span}</Num>
                      </dd>
                    </div>
                  )}
                  {fact.position !== null && fact.position !== undefined && (
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <dt className="font-body text-[10px] font-extrabold text-muted">
                        {t('poll.fact.position')}
                      </dt>
                      <dd className="font-sign text-[13px] font-bold text-ink">
                        {t(POSITION_LABEL[fact.position])}
                      </dd>
                    </div>
                  )}
                  {fact.seasonLabel !== null && (
                    <p className="mt-0.5 font-body text-[10px] leading-snug text-muted">
                      {t('poll.fact.shirt', { season: fact.seasonLabel })}
                    </p>
                  )}
                  {/* which source is on /credits (spec §0.3, 22.9.2026) */}
                  {fact.sourceTitle !== null && <SourceNote newTab className="mt-0.5" />}
                </dl>
              </div>
            )}
          </div>
        )}

        {/* מי לבש את המספר — the archive's season-bound holders; their sources are on /credits */}
        {question.kind === 'number' && (
          <div className="mx-4 mt-3 border-hair border-ink/30 bg-paper p-2.5">
            <p className="font-body text-[8.5px] font-extrabold tracking-[0.18em] text-red">
              {t('poll.number.worn.title', { n: pick })}
            </p>
            {worn.length === 0 ? (
              <p className="mt-1 font-body text-[11.5px] leading-snug text-muted">{t('poll.number.worn.none')}</p>
            ) : (
              <>
                <ol className="mt-1">
                  {worn.slice(0, WORN_SHOWN).map((row) => (
                    <li key={`${row.nameHe}-${row.seasonLabel}`} className="flex items-baseline gap-2 py-[2px]">
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted">
                        <Num>{row.seasonLabel}</Num>
                      </span>
                      <span className="min-w-0 truncate font-sign text-[13px] font-bold text-ink">{row.nameHe}</span>
                      {row.current && (
                        <span className="shrink-0 font-body text-[9.5px] text-muted">{t('poll.number.worn.current')}</span>
                      )}
                    </li>
                  ))}
                </ol>
                {worn.length > WORN_SHOWN && (
                  <p className="mt-0.5 font-body text-[10.5px] text-muted">
                    {t('poll.number.worn.more', { n: String(worn.length - WORN_SHOWN) })}
                  </p>
                )}
                <SourceNote newTab className="mt-1" />
              </>
            )}
          </div>
        )}

        {/* למה דווקא זה — optional, one per question, tap again to clear */}
        {chips.length > 0 && (
          <div className="mt-3 px-4">
            <p className="font-body text-[12px] font-extrabold text-ink">
              {question.kind === 'roster' ? t('poll.why.prompt') : t('poll.why.promptSelf')}
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {chips.map((reason) => {
                const on = chosen === reason
                return (
                  <li key={reason}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        cancel()
                        onReason(reason)
                      }}
                      className={`flex min-h-tap items-center border-hair px-2.5 font-body text-[13px] font-extrabold transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none ${
                        on ? 'border-red bg-red text-sheet' : 'border-ink/40 bg-paper text-ink'
                      }`}
                    >
                      {t(reason)}
                    </button>
                  </li>
                )
              })}
            </ul>
            <p className="mt-1.5 font-body text-[10.5px] leading-snug text-muted">
              {t('poll.why.optional')}
            </p>
          </div>
        )}

        {/* the two ways on, and the one way back */}
        <div className="mt-3 flex gap-2 px-4 pb-[calc(var(--tap)+2rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={skip}
            className="flex min-h-tap flex-1 items-center justify-center bg-red px-3 font-body text-[16px] font-extrabold text-sheet transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
          >
            {last ? t('poll.reaction.done') : t('poll.reaction.next')}
          </button>
          <button
            type="button"
            onClick={rethink}
            className="flex min-h-tap shrink-0 items-center justify-center border-rule border-ink bg-paper px-3.5 font-body text-[14px] font-extrabold text-ink transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
          >
            {t('poll.reaction.rethink')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** the four canonical positions, written out in full so `tests/i18n.test.ts` can see them */
const POSITION_LABEL: Record<'GK' | 'DF' | 'MF' | 'FW', MessageKey> = {
  GK: 'roster.pos.GK',
  DF: 'roster.pos.DF',
  MF: 'roster.pos.MF',
  FW: 'roster.pos.FW',
}
