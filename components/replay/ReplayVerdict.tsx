'use client'

import { Num } from '@/components/ui/Num'
import { SourceNote } from '@/components/ui/SourceNote'
import { ACTION_SHORT, ActionGlyph } from './ReplayBuilder'
import type { ReplayMetrics, TouchVerdict } from '@/lib/game/replay/judge'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * החשיפה — what the score was, and why it was that.
 *
 * "63%" on its own is a number somebody made up as far as the player can tell. So the
 * reveal prints the five things the judge actually weighed, and then one line per touch
 * saying which of them that touch got: the man, the verb, the place he stood, the place
 * he sent it, the shape of the route. A touch the player invented and a touch they missed
 * each get their own row too, named as what they are — because "you were one touch long"
 * is a different sentence from "you had it wrong", and the old verdict could say neither.
 *
 * **Each row leads with the ARCHIVE and then says what you said.** The prototype titled a
 * row with the player's own pick, which reads well when the pick was right and teaches
 * nothing when it was wrong. Here the truth leads, and a row where the man or the verb was
 * wrong adds one more line — `שלך: X · פעולה` — so the correction and the mistake sit on
 * the same line of sight. A touch the report writes with no actor ("הכדור עבר את ההגנה")
 * says so instead of printing the ball as a man, and its player mark is a dash: nobody to
 * be right about.
 *
 * Under every row sits the reporter's own words. That is the part that makes this a
 * history game rather than a scoring screen: the envelope on the pitch is a shape, and
 * this is the sentence the shape was read from.
 *
 * This file was minified once (2e83c04) and grew a Hebrew literal and a second storage
 * system in the process. It is a display again: it stores nothing, and the one sentence
 * it adds lives in the catalogue as `goal.anchorNote`.
 */

const METRICS: Array<{ key: keyof ReplayMetrics; label: MessageKey }> = [
  { key: 'sequence', label: 'goal.metric.sequence' },
  { key: 'players', label: 'goal.metric.players' },
  { key: 'actions', label: 'goal.metric.actions' },
  { key: 'routes', label: 'goal.metric.routes' },
  { key: 'continuity', label: 'goal.metric.continuity' },
]

/**
 * The row's mark — a GLYPH first, and the colour only repeats it. `○` is the same ring
 * the pitch draws around a touch you missed, and `+` the same sign it prints beside one
 * you invented, so the list and the board speak one language.
 */
function mark(verdict: TouchVerdict): string {
  if (verdict.kind === 'missing') return '○'
  if (verdict.kind === 'extra') return '+'
  return verdict.grade === 'good' ? '✓' : verdict.grade === 'near' ? '≈' : '✕'
}

function tick(right: boolean | null): string {
  if (right === null) return '—'
  return right ? '✓' : '✕'
}

function actorName(verdict: TouchVerdict): string {
  if (verdict.truthActorKind === 'unnamed') return t('goal.verdict.unnamed')
  return verdict.truthActorHe ?? ''
}

export function ReplayVerdict({
  metrics,
  touches,
  narrativeHe,
  sourceTitle,
}: {
  metrics: ReplayMetrics
  touches: TouchVerdict[]
  narrativeHe: string
  sourceTitle: string
}) {
  return (
    <div data-goal="verdict" className="mt-2.5 border-rule border-ink bg-sheet p-3">
      <div className="flex items-baseline justify-between gap-2 border-b-hair border-ink/25 pb-2">
        <div className="min-w-0">
          <p className="font-body text-[10px] font-extrabold tracking-widest text-muted">
            {t('goal.overall')}
          </p>
          <p className="mt-0.5 font-body text-[11px] leading-snug text-muted">{t('goal.anchorNote')}</p>
        </div>
        <p className="shrink-0 font-poster text-[38px] leading-none text-red" aria-live="polite">
          <Num>{`${metrics.overall}%`}</Num>
        </p>
      </div>

      <ul className="mt-2 grid grid-cols-5 gap-1">
        {METRICS.map(({ key, label }) => {
          const value = metrics[key]
          return (
            <li key={key} className="border-hair border-ink/30 px-1 py-1.5 text-center">
              <p className="font-poster text-[15px] leading-none text-ink">
                {value === null ? t('goal.metric.none') : <Num>{`${value as number}%`}</Num>}
              </p>
              <p className="mt-0.5 font-body text-[9px] leading-none text-muted">{t(label)}</p>
            </li>
          )
        })}
      </ul>

      <ol className="mt-2.5 border-t-hair border-ink/25">
        {touches.map((verdict, index) => (
          <li key={index} className="flex items-baseline gap-2 border-b-hair border-ink/25 py-1.5">
            <span
              aria-hidden="true"
              className={`w-4 shrink-0 font-latin text-[15px] font-extrabold leading-none ${
                verdict.kind === 'matched' && verdict.grade === 'good'
                  ? 'text-red'
                  : verdict.kind === 'missing'
                    ? 'text-muted'
                    : 'text-sign'
              }`}
            >
              {mark(verdict)}
            </span>
            <span className="min-w-0 flex-1">
              {verdict.kind === 'extra' ? (
                <span className="block font-body text-[12px] font-extrabold leading-snug text-ink">
                  {t('goal.verdict.extra')} — <bdi>{verdict.userActorHe}</bdi>
                  {verdict.userAction && (
                    <span className="font-normal text-muted">
                      {' · '}
                      {t(ACTION_SHORT[verdict.userAction])}
                    </span>
                  )}
                </span>
              ) : (
                <>
                  <span className="flex items-center gap-1.5 font-body text-[12px] font-extrabold leading-snug text-ink">
                    {verdict.truthAction && (
                      <span className="shrink-0">
                        <ActionGlyph action={verdict.truthAction} />
                      </span>
                    )}
                    <bdi>{actorName(verdict)}</bdi>
                    <span className="font-body text-[11px] font-normal text-muted">
                      {verdict.truthAction ? t(ACTION_SHORT[verdict.truthAction]) : ''}
                    </span>
                  </span>
                  {verdict.kind === 'missing' ? (
                    <span className="block font-body text-[11px] leading-snug text-muted">
                      {t('goal.verdict.missing')}
                    </span>
                  ) : (
                    <>
                      <span className="block font-body text-[11px] leading-snug text-muted">
                        {t('goal.verdict.player')} {tick(verdict.playerRight)} ·{' '}
                        {t('goal.verdict.action')} {tick(verdict.actionRight)} ·{' '}
                        {t('goal.verdict.origin')} <Num>{Math.round(verdict.originScore)}</Num> ·{' '}
                        {t('goal.verdict.target')} <Num>{Math.round(verdict.targetScore)}</Num>
                        {verdict.routeScore !== null && (
                          <>
                            {' · '}
                            {t('goal.verdict.route')} <Num>{Math.round(verdict.routeScore)}</Num>
                          </>
                        )}
                      </span>
                      {(verdict.playerRight === false || !verdict.actionRight) &&
                        verdict.userActorHe &&
                        verdict.userAction && (
                          <span data-goal="yours" className="block font-body text-[11px] font-extrabold leading-snug text-sign">
                            <bdi>
                              {t('goal.verdict.yours', {
                                name: verdict.userActorHe,
                                act: t(ACTION_SHORT[verdict.userAction]),
                              })}
                            </bdi>
                          </span>
                        )}
                    </>
                  )}
                  {verdict.positionHe && (
                    <span className="block font-mono text-[11px] leading-snug tabular-nums text-muted">
                      <bdi>
                        {t('goal.sourceWords')} {verdict.positionHe} — {verdict.noteHe}
                      </bdi>
                    </span>
                  )}
                </>
              )}
            </span>
            {verdict.kind === 'matched' && (
              <span className="shrink-0 font-poster text-[14px] leading-none text-muted">
                <Num>{`${Math.round(verdict.score)}%`}</Num>
              </span>
            )}
          </li>
        ))}
      </ol>

      <p className="mt-2 font-body text-step--1 leading-relaxed text-ink">{narrativeHe}</p>
      <p className="mt-1.5 font-body text-[11px] leading-snug text-muted">{t('goal.envelopeNote')}</p>
      {/* which report the goal was rebuilt from is on /credits (spec §0.3, 22.9.2026) */}
      {sourceTitle !== '' && <SourceNote newTab className="mt-1" />}
    </div>
  )
}
