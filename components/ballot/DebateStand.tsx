'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { PlayLink } from '@/components/play/PlayLink'
import { RosterSheet } from '@/components/roster/RosterSheet'
import { firePickFxAt } from '@/components/stage/PickFx'
import { SlideSheet } from '@/components/stage/SlideSheet'
import type { RosterIndex } from '@/lib/game/allTimeXI'
import type { Tally } from '@/lib/polls/ballot'
import { boardDisplay, rankRows } from '@/lib/polls/board'
import { activeDebateStore, type DebateReasons, type DebateVotes } from '@/lib/polls/debate-store'
import { DEBATE_REASONS, type DebateView } from '@/lib/polls/debates'
import { ExitEmotion } from '@/components/result/UniversalExit'
import { t } from '@/lib/i18n'
import { voice, voiceAction } from '@/lib/voice'

/**
 * הוויכוח של היציע — gate 7's second half (ONE RED WORLD §16, P0.3).
 *
 * A handful of debates dealt by `(seed, cursor)`. Each one runs the same four beats and
 * never shows a count before the vote: the question → the pick (the whole roster through
 * the shared `RosterSheet`, or a list the archive holds) → "זאת הבחירה שלך." with the why
 * chips → and only if asked, "רוצה לראות מה היציע אמר?".
 *
 * The count is `lib/polls/board.ts`'s classification, the same one the ballot's board uses:
 * nothing, or only your own vote, is the honesty plate; under a hundred is exact integers;
 * a percentage is earned at a hundred. The screen never names a storage API — the store is
 * `lib/polls/debate-store.ts` — and nothing here holds a vote it did not read from it.
 */
export function DebateStand({
  debates,
  roster,
  slot,
  slices,
}: {
  debates: DebateView[]
  roster: RosterIndex
  slot: number
  slices: number
}) {
  const store = useMemo(() => activeDebateStore(), [])
  const [votes, setVotes] = useState<DebateVotes>({})
  const [reasons, setReasons] = useState<DebateReasons>({})
  const [open, setOpen] = useState<string | null>(null)
  const [tallies, setTallies] = useState<Record<string, Tally | null | 'loading'>>({})

  useEffect(() => {
    let live = true
    void Promise.all([store.read(), store.reasons()]).then(([read, why]) => {
      if (!live) return
      setVotes(read)
      setReasons(why)
    })
    return () => {
      live = false
    }
  }, [store])

  const nameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const entry of roster.all) {
      map.set(entry.slug, entry.nameHe)
      if (entry.id) map.set(entry.id, entry.nameHe)
    }
    return map
  }, [roster.all])

  const label = useCallback(
    (debate: DebateView, pick: string): string =>
      debate.choices ? (debate.choices.find((choice) => choice.id === pick)?.labelHe ?? t('terrace.count.other')) : (nameById.get(pick) ?? t('terrace.count.other')),
    [nameById],
  )

  const cast = useCallback(
    async (debate: DebateView, pick: string) => {
      setOpen(null)
      setVotes((current) => ({ ...current, [debate.id]: pick }))
      // a changed mind hides the old count until it is asked for again
      setTallies((current) => {
        const next = { ...current }
        delete next[debate.id]
        return next
      })
      await store.save(debate.id, pick)
    },
    [store],
  )

  const markReason = useCallback(
    async (debateId: string, reason: string) => {
      setReasons((current) => {
        const next = { ...current }
        if (next[debateId] === reason) delete next[debateId]
        else next[debateId] = reason
        return next
      })
      await store.saveReason(debateId, reason)
    },
    [store],
  )

  const askCount = useCallback(
    async (debateId: string) => {
      setTallies((current) => ({ ...current, [debateId]: 'loading' }))
      const tally = await store.tally(debateId)
      setTallies((current) => ({ ...current, [debateId]: tally }))
    },
    [store],
  )

  const active = debates.find((debate) => debate.id === open) ?? null

  return (
    <section aria-labelledby="terrace-open" className="flex min-h-0 flex-1 flex-col md:block md:flex-none">
      <header className="shrink-0 border-b-rule border-ink pb-3">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-red" dir="ltr">
          {t('terrace.latin')}
        </p>
        <h2 id="terrace-open" className="mt-1 font-display text-step-2 leading-tight text-ink">
          {voice({ gate: 7, moment: 'intro', seed: slot }).title}
        </h2>
        <p className="mt-1 font-mono text-[11px] tabular-nums text-concrete">
          {t('terrace.round', { n: String(slot + 1), of: String(slices) })}
        </p>
      </header>

      <ol className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain py-3 md:overflow-visible">
        {debates.map((debate, index) => {
          const pick = votes[debate.id] ?? null
          const tally = tallies[debate.id]
          return (
            <li key={debate.id} className="border-rule border-ink bg-paper">
              <div className="grid grid-cols-[auto_1fr] gap-3 p-3">
                <span aria-hidden="true" className="font-poster text-[34px] leading-none text-red">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-step-1 leading-snug text-ink">{debate.promptHe}</h3>
                  {pick === null ? (
                    <button
                      type="button"
                      onClick={() => setOpen(debate.id)}
                      className="mt-3 flex min-h-tap w-full items-center justify-between bg-red px-4 font-display text-step-1 text-paper transition-transform duration-press ease-stamp active:scale-[.97] motion-reduce:transition-none"
                    >
                      <span>{debate.kind === 'roster' ? t('terrace.pick.roster') : t('terrace.pick.list')}</span>
                      <span aria-hidden="true">←</span>
                    </button>
                  ) : (
                    <div className="mt-3">
                      <p className="font-body text-[12px] font-extrabold text-red">{voiceAction(7, 'voted')}</p>
                      <p className="font-display text-step-2 leading-tight text-ink">
                        <bdi>{label(debate, pick)}</bdi>
                      </p>
                      <p className="mt-3 font-body text-[12px] font-bold text-ink">{t('terrace.why')}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {DEBATE_REASONS.map((reason) => {
                          const on = reasons[debate.id] === reason.id
                          return (
                            <button
                              key={reason.id}
                              type="button"
                              aria-pressed={on}
                              onClick={() => void markReason(debate.id, reason.id)}
                              className={`min-h-tap border-rule px-3 font-body text-[13px] font-bold transition-transform duration-press active:scale-[.96] motion-reduce:transition-none ${
                                on ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-sheet text-ink'
                              }`}
                            >
                              {t(reason.he)}
                            </button>
                          )
                        })}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {tally === undefined && (
                          <button
                            type="button"
                            onClick={() => void askCount(debate.id)}
                            className="min-h-tap border-rule border-red bg-paper px-4 font-display text-step-0 text-red transition-transform duration-press active:scale-[.97] motion-reduce:transition-none"
                          >
                            {voiceAction(7, 'seeTerrace')}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setOpen(debate.id)}
                          className="min-h-tap px-2 font-body text-[12px] font-bold text-concrete underline underline-offset-4"
                        >
                          {t('terrace.change')}
                        </button>
                      </div>
                      {tally !== undefined && <Count tally={tally} pick={pick} label={(value) => label(debate, value)} />}
                    </div>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      {/* §16 — every debate of the slice answered: the voice closes it. No count is invented
          here; the terrace's numbers are only ever the ones the store read back. */}
      {debates.length > 0 && debates.every((debate) => votes[debate.id]) && (
        <div className="shrink-0 border-t-rule border-ink py-2" data-terrace="done">
          <ExitEmotion voice={voice({ gate: 7, moment: 'result', result: 'done', seed: slot })} compact />
        </div>
      )}

      <div className="shrink-0 pt-1">
        <PlayLink
          gate="/polls"
          href="/polls?tab=debate"
          className="flex min-h-tap w-full items-center justify-between border-rule border-ink bg-ink px-4 font-display text-step-1 text-paper transition-transform duration-press ease-stamp active:scale-[.97] motion-reduce:transition-none"
        >
          <span>{t('terrace.more')}</span>
          <span aria-hidden="true">←</span>
        </PlayLink>
      </div>

      {active !== null && active.kind === 'roster' && (
        <RosterSheet
          key={active.id}
          title={active.promptHe}
          roster={roster}
          initialFilter={active.filter}
          onPick={(entry) => void cast(active, entry.id ?? entry.slug)}
          onClose={() => setOpen(null)}
        />
      )}

      <SlideSheet
        open={active !== null && active.kind !== 'roster'}
        onClose={() => setOpen(null)}
        title={active?.promptHe ?? ''}
        size="full"
      >
        {active?.choices && active.choices.length > 0 ? (
          <ul className="divide-y divide-ink/15">
            {active.choices.map((choice) => (
              <li key={choice.id}>
                <button
                  type="button"
                  aria-pressed={votes[active.id] === choice.id}
                  onClick={(event) => {
                    firePickFxAt(event.currentTarget, { tone: 'ink', haptic: 'tap' })
                    void cast(active, choice.id)
                  }}
                  className={`flex min-h-tap w-full flex-col items-start justify-center px-2 py-2 text-start transition-colors motion-reduce:transition-none ${
                    votes[active.id] === choice.id ? 'bg-ink text-paper' : 'text-ink hover:bg-paper'
                  }`}
                >
                  <span className="font-display text-step-1 leading-tight">
                    <bdi>{choice.labelHe}</bdi>
                  </span>
                  {choice.subHe && <span className="font-body text-[12px] opacity-70">{choice.subHe}</span>}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-2 py-4 font-body text-[13px] text-ink">{t('terrace.options.empty')}</p>
        )}
      </SlideSheet>
    </section>
  )
}

function Count({ tally, pick, label }: { tally: Tally | null | 'loading'; pick: string; label: (pick: string) => string }) {
  if (tally === 'loading') {
    return <p className="mt-3 font-body text-[12px] text-concrete" aria-live="polite">{t('terrace.count.loading')}</p>
  }
  const shape = boardDisplay(tally, pick)
  if (shape.kind === 'honest') {
    return (
      <p className="mt-3 border-s-rule border-red bg-sheet px-3 py-2 font-body text-[12.5px] leading-snug text-ink" aria-live="polite">
        {t('terrace.count.honest')}
      </p>
    )
  }
  const rows = rankRows(tally?.rows ?? [], shape.total).slice(0, 5)
  return (
    <div className="mt-3 border-hair border-ink/30 bg-sheet p-3" aria-live="polite">
      <p className="font-body text-[12.5px] font-bold text-ink">{t('terrace.count.total', { n: String(shape.total) })}</p>
      <ol className="mt-2 space-y-1">
        {rows.map((row) => (
          <li key={row.pick} className="grid grid-cols-[1fr_auto] items-baseline gap-3 font-body text-[13px] text-ink">
            <span className={row.pick === pick ? 'font-extrabold text-red' : ''}>
              <bdi>{label(row.pick)}</bdi>
              {row.pick === pick && <span className="ms-2 text-[11px]">{t('terrace.count.you')}</span>}
            </span>
            <span className="font-mono tabular-nums">{shape.kind === 'percent' ? `${row.pct}%` : row.votes}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
