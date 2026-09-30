'use client'

import { KitShirt } from '@/components/kit/KitShirt'
import { NumberPicker } from '@/components/profile/NumberPicker'
import { PressPitch } from '@/components/press/PressPitch'
import type { RosterEntry } from '@/lib/game/allTimeXI'
import type { RosterFilter } from '@/lib/game/roster-search'
import type { KitSpec } from '@/lib/kit/spec'
import { BALLOT, POSITIONS, POSITION_SPOT, type PollQuestion } from '@/lib/polls/ballot'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * הבמה — one debate at a time (players.md §2, Gate 7 V3).
 *
 * The slip used to be the whole screen: eight rows, each opening a picker. The reference
 * puts ONE question on a stage above it and lets the slip become the progress rail, and
 * that is what this is. The stage asks, the voter answers here, the reaction plays, and
 * the next empty question takes the stage.
 *
 *  · **a player question** opens the shared roster sheet PRE-FILTERED by the question
 *    (the keepers, the foreign-slot men) — never a list of names the app featured — and
 *    offers, optionally, the voter's own gate 1 eleven as a row of shortcuts;
 *  · **the number** is the 1–99 grid, here on the stage, with the shirt back filling in;
 *  · **the position** is picked on a pitch, and what is stored is the code.
 */
export function QuestionStage({
  question,
  index,
  pickLabel,
  filter,
  fromXi,
  shirt,
  number,
  position,
  onOpenRoster,
  onPickEntry,
  onNumber,
  onPosition,
  onStep,
}: {
  question: PollQuestion
  index: number
  /** what is already on the slip for this question, printed; null when empty */
  pickLabel: string | null
  /** the filter the roster sheet will open with, for the hint line */
  filter: Partial<RosterFilter>
  /** the voter's own all-time XI, narrowed by the same filter — optional shortcuts */
  fromXi: readonly RosterEntry[]
  /** the club's home kit, for the number's shirt back */
  shirt: KitSpec
  number: number | null
  position: string | null
  onOpenRoster: () => void
  onPickEntry: (entry: RosterEntry) => void
  onNumber: (n: number) => void
  onPosition: (code: string) => void
  /**
   * The walk between the eight questions. Absent when the stage is ONE question on its own
   * (THE WORKER LIFE's ticket office asks one a chapter): then there is no count and no
   * way to a question that is not being asked.
   */
  onStep?: (delta: -1 | 1) => void
}) {
  return (
    <section className="border-rule border-ink bg-sheet" aria-labelledby="poll-stage-ask">
      <div className="flex items-center justify-between gap-2 bg-ink px-3.5 py-2">
        <p dir="ltr" className="font-latin text-[9px] font-bold tracking-[0.18em] text-red">
          {question.latin}
        </p>
        {/* a sentence, not a digit run — <Num> would reverse it (CLAUDE.md §69.7) */}
        {onStep && (
          <p className="font-mono text-[11px] tabular-nums text-concrete">
            {t('poll.run.count', { n: String(index + 1), total: String(BALLOT.length) })}
          </p>
        )}
      </div>
      <div className="px-3.5 pb-3 pt-2.5">
        <h2 id="poll-stage-ask" className="font-display text-step-2 leading-tight text-ink">
          {t(question.ask)}
        </h2>
        <p className="mt-1 font-body text-[12.5px] leading-snug text-muted">{t(question.sub)}</p>

        {pickLabel !== null && (
          <p className="mt-2 flex items-center gap-2 border-s-rule border-red ps-2 font-sign text-[16px] font-bold leading-tight text-red">
            <span className="font-body text-[10px] font-extrabold tracking-[0.16em] text-muted">{t('poll.run.yours')}</span>
            {pickLabel}
          </p>
        )}

        {question.kind === 'roster' && (
          <div className="mt-3">
            {fromXi.length > 0 && (
              <div>
                <p className="font-body text-[10.5px] font-extrabold tracking-wide text-muted">{t('poll.run.fromXi')}</p>
                <ul className="-mx-0.5 mt-1 flex gap-1.5 overflow-x-auto px-0.5 pb-1">
                  {fromXi.map((entry) => (
                    <li key={entry.id ?? entry.slug} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => onPickEntry(entry)}
                        className="flex min-h-tap items-center border-hair border-ink/40 bg-paper px-2.5 font-body text-[12px] font-extrabold text-ink transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none"
                      >
                        {entry.nameHe}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              type="button"
              onClick={onOpenRoster}
              className="mt-2 flex min-h-[52px] w-full items-center justify-between gap-3 border-rule border-ink bg-red px-4 font-body text-[16px] font-extrabold text-sheet transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
            >
              <span>{pickLabel ? t('poll.run.change') : t('poll.run.open')}</span>
              <span aria-hidden="true" className="font-mono text-[18px]">
                ←
              </span>
            </button>
            <p className="mt-1.5 font-body text-[11px] leading-snug text-muted">{filterHint(filter)}</p>
          </div>
        )}

        {question.kind === 'number' && (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="mx-auto w-[96px] shrink-0 sm:mx-0">
              <KitShirt spec={{ ...shirt, number, sponsorHe: shirt.sponsorHe }} className="block w-full" title={t('poll.run.back')} />
            </div>
            <NumberPicker
              value={number}
              onPick={onNumber}
              label={t('poll.pickNumber')}
              className="grid max-h-[44vh] flex-1 grid-cols-6 gap-1.5 overflow-y-auto overscroll-contain pe-0.5 min-[400px]:grid-cols-7 sm:grid-cols-10"
            />
          </div>
        )}

        {question.kind === 'position' && <PositionPitch value={position} onPick={onPosition} />}

        {onStep && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onStep(-1)}
            disabled={index === 0}
            className="min-h-tap px-2 font-body text-[12px] font-extrabold text-ink disabled:opacity-30"
          >
            {t('poll.run.prev')}
          </button>
          <button
            type="button"
            onClick={() => onStep(1)}
            disabled={index === BALLOT.length - 1}
            className="min-h-tap px-2 font-body text-[12px] font-extrabold text-ink disabled:opacity-30"
          >
            {t('poll.run.skip')}
          </button>
        </div>
        )}
      </div>
    </section>
  )
}

const FILTER_HINT: Record<string, MessageKey> = {
  GK: 'poll.run.filter.GK',
  DF: 'poll.run.filter.DF',
  MF: 'poll.run.filter.MF',
  FW: 'poll.run.filter.FW',
  foreign: 'poll.run.filter.foreign',
}

function filterHint(filter: Partial<RosterFilter>): string {
  if (filter.position && filter.position !== 'any' && FILTER_HINT[filter.position]) {
    return t(FILTER_HINT[filter.position] as MessageKey)
  }
  if (filter.origin === 'foreign') return t('poll.run.filter.foreign')
  return t('poll.run.filter.none')
}

/**
 * העמדה — eight marks on the printed pitch (`PressPitch`, the press layer's own drawing),
 * our goal at the bottom. The coordinates are display only; the answer stored is the
 * code. Ink on paper plates, so nothing red touches the grass.
 */
function PositionPitch({ value, onPick }: { value: string | null; onPick: (code: string) => void }) {
  return (
    <div className="mx-auto mt-3 w-full max-w-[320px]" role="group" aria-label={t('poll.pickPosition')}>
      <PressPitch className="touch-manipulation">
      {POSITIONS.map((position) => {
        const spot = POSITION_SPOT[position.id] ?? { x: 50, y: 50 }
        const live = value === position.id
        return (
          <button
            key={position.id}
            type="button"
            onClick={() => onPick(position.id)}
            aria-pressed={live}
            data-position={position.id}
            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
            className={`absolute flex min-h-tap -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center border-rule border-press-ink px-2 py-1 leading-tight transition-transform duration-press ease-stamp active:scale-[.94] motion-reduce:transition-none ${
              live ? 'bg-press-ink text-press-paper' : 'bg-press-paper text-press-ink'
            }`}
          >
            <span dir="ltr" className="font-mono text-[9px] tracking-widest opacity-80">
              {position.id}
            </span>
            <span className="font-sign text-[13px] font-bold">{t(position.he)}</span>
          </button>
        )
      })}
      </PressPitch>
    </div>
  )
}
