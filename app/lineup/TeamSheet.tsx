'use client'

import { useEffect, useState, type ReactNode } from 'react'

import { ExitEmotion, ExitNext, ExitShare } from '@/components/result/UniversalExit'
import { Num } from '@/components/ui/Num'
import { SourceNote } from '@/components/ui/SourceNote'
import { t, type MessageKey } from '@/lib/i18n'
import {
  REVEAL_SET,
  REVEAL_SKIPPED,
  buildReveal,
  ghostsUpTo,
  missingStarters,
  opensAtSummary,
  tallyUpTo,
  type LineupVerdict,
  type PlacementStatus,
  type RevealRow,
} from '@/lib/game/lineup-sheet'
import type { KitSpec } from '@/lib/kit/spec'
import type { ShirtLook } from '@/lib/kit/playerShirt'
import { collect, collected, readProfile } from '@/lib/profile/store'
import { haptic } from '@/lib/play/haptics'
import { track } from '@/lib/analytics/meter'
import type { NextAction } from '@/lib/results/types'
import { microFeedback, voiceAction, type VoiceOut } from '@/lib/voice'
import { BandPitch, LINE_LABEL, type BandMan } from './BandPitch'
import { useFastWalk } from './fastWalk'

/**
 * הבדיקה ודף ההרכב — the per-player reveal, and the sheet it ends on.
 *
 * ## The reveal, and the one thing it may not do
 *
 * The prototype walks the eleven on an 820ms timer and the master brief lists it by name
 * as what not to build: *"waiting 850ms × 11 players just to see Gate 3 results"*. So
 * **this file holds no timer**. The walk moves when the player moves it; "להציג הכול" is
 * on screen at every step; and a player who wants to WATCH the sheet fill can press the
 * fast walk (`useFastWalk` — ≤250ms a row, stopped by any tap). A device that skipped
 * once opens on the sheet from then on, with the walk offered rather than imposed — one
 * id in `lib/profile/store.ts`'s collections.
 *
 * ## Ghosts, and three kinds of "didn't start" (21.9.2026)
 *
 * The starters nobody placed are drawn as dashed ghosts IN THEIR BAND once the walk has
 * passed that band — they used to be a line of text under the sheet. And a man who did
 * not start says which of three things the archive knows about him, with its source:
 * he came on that night, he was in that season's squad, or nothing beyond "didn't start".
 *
 * ## The sheet
 *
 * Four separate numbers, because they measure four different things: the men in the
 * right band, the starters in the wrong band, the documented substitutes walked into,
 * and the LOCKs that held. `benchKnown` is why the trap count can be absent rather than
 * zero.
 */

const STATUS_MARK: Record<PlacementStatus, string> = {
  exact: '✓',
  wrong_line: '↔',
  not_in_xi: '✗',
}

/** Never colour alone: a mark and a word each. Off the grass, red on cream is fine. */
const STATUS_STYLE: Record<PlacementStatus, string> = {
  exact: 'border-red bg-red text-sheet',
  wrong_line: 'border-red bg-sheet text-red',
  not_in_xi: 'border-ink bg-sheet text-ink line-through',
}

/**
 * The walk's micro-feedback (§12): a right man speaks in the voice's `correct` pool ("עלה
 * איתם."), a man who did not start in its `wrong` pool ("לא באותו ערב."), walked by his place
 * in the reveal so eleven verdicts do not repeat one line. The middle case — a starter in
 * the wrong band — keeps its own sourced word; the voice has no line for "right man,
 * wrong line".
 */
function verdictWord(row: RevealRow, seed: string, index: number): string {
  if (row.status === 'exact') return microFeedback(3, 'correct', seed, index)?.line ?? ''
  if (row.status === 'not_in_xi') return microFeedback(3, 'wrong', seed, index)?.line ?? ''
  return t('lineup.reveal.mid')
}

const STATUS_LABEL: Record<PlacementStatus, MessageKey> = {
  exact: 'lineup.exact',
  wrong_line: 'lineup.zone.wrongLine',
  not_in_xi: 'lineup.notInXi',
}

/** The sentence under a verdict — for a non-starter, the sourced kind of "didn't start". */
function verdictNote(row: RevealRow): string {
  if (row.status === 'exact') return t('lineup.reveal.ok.note')
  if (row.status === 'wrong_line') return t('lineup.reveal.mid.note')
  return decoyLine(row)
}

function decoyLine(row: RevealRow): string {
  const decoy = row.decoy
  if (!decoy || decoy.kind === 'other') return t('lineup.decoy.other')
  if (decoy.kind === 'sub-on') {
    return decoy.minute !== null ? t('lineup.decoy.subOn.minute', { n: String(decoy.minute) }) : t('lineup.decoy.subOn')
  }
  // the squad's source is on /credits (spec §0.3, 22.9.2026), not in the sentence
  return t('lineup.decoy.squad')
}

export function TeamSheet({
  verdict,
  locks,
  notesTaken,
  kit,
  look = null,
  keeperLook = null,
  seed = '0',
  spoken,
  doors = [],
  share,
  onBack,
  children,
}: {
  verdict: LineupVerdict
  locks: readonly string[]
  notesTaken: number
  kit: KitSpec | null
  /** the match season's REAL shirt (delta 88), as on the lockers */
  look?: ShirtLook | null
  keeperLook?: ShirtLook | null
  /** the round, for the voice's deterministic walk through its pools */
  seed?: string
  /** the result line — "מצאת 9 מתוך 11." (lib/voice, §12) */
  spoken: VoiceOut
  /** the Universal Exit's one or two doors (§6) */
  doors?: readonly NextAction[]
  /** the gate's one share (rule 19), under "שלח ליציע" */
  share?: ReactNode
  /** back into the locker room with the same eleven still standing */
  onBack: () => void
  /** the share row and the replay link, which belong to the board that owns the round */
  children?: ReactNode
}) {
  const rows = buildReveal(verdict, locks)
  const missing = missingStarters(verdict)
  /** the men sent out who did not start that night — "who you put in by mistake" */
  const wrongIn = rows.filter((row) => row.status === 'not_in_xi')

  // Read once, on the first client render — this only mounts after a submission.
  const [stage, setStage] = useState<'reveal' | 'sheet'>(() =>
    opensAtSummary(collected(readProfile(), REVEAL_SET)) ? 'sheet' : 'reveal',
  )
  const [index, setIndex] = useState(-1)
  // the exit's measurement (§37): the sheet is the result a person stops at
  useEffect(() => {
    if (stage === 'sheet') track('result_view', { detail: 'lineup' })
  }, [stage])

  function step() {
    if (index >= rows.length - 1) return
    setIndex(index + 1)
  }

  const fast = useFastWalk({ step, atEnd: index >= rows.length - 1 })

  function showAll() {
    fast.stop()
    // remembered only on the deliberate press
    collect(REVEAL_SET, [REVEAL_SKIPPED])
    setIndex(rows.length - 1)
    setStage('sheet')
  }

  function next() {
    fast.stop()
    if (index >= rows.length - 1) {
      setStage('sheet')
      return
    }
    const row = rows[index + 1]
    if (row) haptic(row.status === 'not_in_xi' ? 'miss' : 'tap')
    step()
  }

  const shownTo = stage === 'sheet' ? rows.length - 1 : index
  const running = tallyUpTo(rows, shownTo)
  const current = index >= 0 ? rows[index] : undefined

  const men: BandMan[] = [
    ...rows.map((row, at) => ({
      playerId: row.playerId,
      nameHe: row.nameHe,
      line: row.line,
      order: row.order,
      locked: row.locked,
      mark: at <= shownTo ? row.status : null,
    })),
    ...(stage === 'sheet' ? missing : ghostsUpTo(verdict, rows, index)).map((man, order) => ({
      playerId: man.playerId,
      nameHe: man.nameHe,
      line: man.line,
      order: 100 + order,
      ghost: true,
    })),
  ]

  return (
    <>
      {stage === 'reveal' && (
        // Any tap on the reveal stops a fast walk — the walk is the player's, not the clock's.
        <section className="mt-stack" onPointerDown={() => fast.running && fast.stop()}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-step-2 leading-tight text-ink">{t('lineup.reveal.title')}</h2>
            <p className="font-mono text-step-1 tabular-nums text-red">
              <Num>{`${String(index + 1).padStart(2, '0')}/${rows.length}`}</Num>
            </p>
          </div>

          <div className="mt-3">
            <BandPitch men={men} kit={kit} look={look} keeperLook={keeperLook} active={current?.playerId ?? null} />
          </div>

          <div className="mt-3 border-rule border-ink bg-sheet p-3" aria-live="polite">
            {current === undefined ? (
              <p className="font-body text-step-0 leading-relaxed text-ink">{t('lineup.reveal.lede')}</p>
            ) : (
              <>
                <p className="font-body text-[11px] font-extrabold tracking-widest text-muted">
                  {t('lineup.reveal.step', { n: String(index + 1), of: String(rows.length) })} ·{' '}
                  {t(LINE_LABEL[current.line])}
                </p>
                <p className="mt-1 font-display text-step-3 leading-tight text-ink">
                  {current.nameHe}
                  {current.locked && (
                    <span className="ms-2 border-hair border-ink px-1 font-mono text-[10px] tabular-nums text-ink">
                      LOCK
                    </span>
                  )}
                </p>
                <p className={`mt-1 font-display text-step-2 leading-tight ${current.status === 'exact' ? 'text-red' : 'text-ink'}`}>
                  <span aria-hidden="true" className="me-1">
                    {STATUS_MARK[current.status]}
                  </span>
                  {verdictWord(current, seed, index)}
                </p>
                <p className="mt-1 font-body text-step--1 leading-relaxed text-muted">{verdictNote(current)}</p>
              </>
            )}

            <ul className="mt-3 flex flex-wrap gap-2">
              <Tally label={t('lineup.exact')} value={running.exact} />
              <Tally label={t('lineup.zone.wrongLine')} value={running.wrongLine} />
              {verdict.benchKnown && <Tally label={t('lineup.benchTrap')} value={running.bench} />}
            </ul>
          </div>

          {/*
            The controls, at every step, always enabled. The skip is not a mode — it is a
            button that never leaves the screen. The fast walk is a toggle beside it.
          */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={next}
              className="col-span-2 flex min-h-tap items-center justify-center bg-red px-4 font-body text-step-0 font-extrabold text-paper transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none sm:col-span-1"
            >
              {index < 0 ? t('lineup.reveal.begin') : index >= rows.length - 1 ? t('lineup.zone.toSheet') : t('lineup.reveal.next')}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                if (fast.running) fast.stop()
                else fast.start()
              }}
              onPointerDown={(event) => event.stopPropagation()}
              aria-pressed={fast.running}
              className="flex min-h-tap items-center justify-center border-rule border-ink bg-sheet px-3 font-body text-step-0 font-extrabold text-ink transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none"
            >
              {fast.running ? t('lineup.zone.fastStop') : t('lineup.zone.fast')}
            </button>
            <button
              type="button"
              onClick={showAll}
              className="flex min-h-tap items-center justify-center border-rule border-ink bg-sheet px-3 font-body text-step-0 font-extrabold text-ink transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none"
            >
              {t('lineup.reveal.all')}
            </button>
          </div>
        </section>
      )}

      {stage === 'sheet' && (
        <section className="mt-stack" data-exit="universal">
          {/* §6 layer 1 — "מצאת 9 מתוך 11." No percentage: a count of men. */}
          <ExitEmotion voice={spoken} />

          <ul className="mt-3 flex flex-wrap gap-2">
            <Tally label={t('lineup.exact')} value={running.exact} />
            <Tally label={t('lineup.zone.wrongLine')} value={running.wrongLine} />
            {verdict.benchKnown && <Tally label={t('lineup.benchTrap')} value={running.bench} />}
            <Tally label={t('lineup.locksRight')} value={running.locksRight} of={running.locksUsed} />
            <Tally label={t('lineup.notesTaken')} value={notesTaken} />
          </ul>

          {!verdict.benchKnown && (
            <p className="mt-2 font-body text-step--1 leading-relaxed text-muted">{t('lineup.benchTrap.unknown')}</p>
          )}

          <div className="mt-3">
            <BandPitch men={men} kit={kit} look={look} keeperLook={keeperLook} />
          </div>
          {missing.length > 0 && (
            <p className="mt-1 font-body text-[11px] leading-snug text-muted">{t('lineup.zone.ghostNote')}</p>
          )}

          <ul className="mt-stack border-t-hair border-ink/20">
            {rows.map((row) => (
              <li key={row.playerId} className="flex items-center justify-between gap-3 border-b-hair border-ink/20 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-body text-[13px] text-ink">
                    {row.nameHe}
                    {row.locked && (
                      <span className="ms-2 border-hair border-ink px-1 font-mono text-[9px] tabular-nums text-ink">
                        LOCK
                      </span>
                    )}
                  </span>
                  <span className="block font-body text-[11px] leading-snug text-muted">
                    {t(LINE_LABEL[row.line])} · {row.status === 'not_in_xi' ? decoyLine(row) : t(STATUS_LABEL[row.status])}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`grid h-6 w-6 shrink-0 place-items-center border-hair font-sign text-[12px] leading-none ${STATUS_STYLE[row.status]}`}
                >
                  {STATUS_MARK[row.status]}
                </span>
              </li>
            ))}
          </ul>

          {/* §12 — after the reveal: who you missed, and who you put in by mistake */}
          <div className="mt-stack grid gap-2 sm:grid-cols-2" data-lineup="after">
            <div className="border-rule border-ink bg-sheet p-3" data-lineup="missed">
              <p className="font-body text-[11px] font-extrabold tracking-widest text-muted">{voiceAction(3, 'missed')}</p>
              <p className="mt-1 font-body text-step--1 leading-relaxed text-ink">
                {missing.length === 0
                  ? voiceAction(3, 'noneMissed')
                  : missing.map((man) => `${man.nameHe} (${t(LINE_LABEL[man.line])})`).join(' · ')}
              </p>
            </div>
            <div className="border-rule border-ink bg-sheet p-3" data-lineup="wrong-in">
              <p className="font-body text-[11px] font-extrabold tracking-widest text-muted">{voiceAction(3, 'wrongIn')}</p>
              <p className="mt-1 font-body text-step--1 leading-relaxed text-ink">
                {wrongIn.length === 0 ? voiceAction(3, 'noneWrong') : wrongIn.map((row) => row.nameHe).join(' · ')}
              </p>
            </div>
          </div>

          {verdict.sourceTitle !== '' && <SourceNote newTab className="mt-3" />}

          <div className="mt-stack grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onBack}
              className="flex min-h-tap items-center justify-center border-rule border-ink bg-sheet px-4 font-body text-step-0 font-extrabold text-ink transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none"
            >
              {t('lineup.back')}
            </button>
            <button
              type="button"
              onClick={() => {
                setIndex(-1)
                setStage('reveal')
              }}
              className="flex min-h-tap items-center justify-center border-rule border-ink bg-sheet px-4 font-body text-step-0 font-extrabold text-ink transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none"
            >
              {t('lineup.reveal.again')}
            </button>
          </div>

          {/* §6 layers 2 and 3 — one or two doors, then "שלח ליציע" (the gate's own share) */}
          <ExitNext next={doors} from="lineup" />
          <ExitShare label={spoken.ctaShare} from="lineup">
            {share}
          </ExitShare>

          {children}
        </section>
      )}
    </>
  )
}

function Tally({ label, value, of }: { label: string; value: number; of?: number }) {
  return (
    <li className="flex min-h-[38px] items-center gap-2 border-hair border-ink px-2 font-body text-[12px] text-ink">
      <span className="font-mono text-step-0 tabular-nums">
        <Num>{of === undefined ? String(value) : `${value}/${of}`}</Num>
      </span>
      {label}
    </li>
  )
}
