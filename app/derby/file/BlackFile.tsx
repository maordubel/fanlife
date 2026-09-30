'use client'

import { useState, useTransition, type ReactNode } from 'react'

import { AdSlot } from '@/components/ads/AdSlot'
import { Num } from '@/components/ui/Num'
import { PlayLink } from '@/components/play/PlayLink'
import { RecordRun } from '@/components/play/RecordRun'
import { ShareRow } from '@/components/share/ShareRow'
import { artFor } from '@/lib/share/story'
import { SourceNote } from '@/components/ui/SourceNote'
import { t, type MessageKey } from '@/lib/i18n'
import { microFeedback } from '@/lib/voice'
import type { CardVerdict, FileCard, PairCard, PairVerdict } from '@/lib/game/blackfile'
import { submitCard, submitPair } from './actions'

/**
 * התיק השחור — the away end's game.
 *
 * Two halves, both fast:
 *   1. **מי חצה את הכביש** — a name, and one binary: did he sign for Maccabi Tel Aviv
 *      or not. The whole point is the two cards where the crowd is wrong.
 *   2. **מה קרה קודם** — two dated events from the club's hardest decade, pick the
 *      earlier one.
 *
 * Navy only. No vermilion anywhere on this screen — the gate 11 rule holds inside the
 * gate, not just on its plate. It sits on the SAME dead-grass field as the duel
 * (`bg-hate-*` tokens, the marked block at the foot of `app/globals.css`), because it
 * is the same ground — but it is a different act, and it must read colder: no red
 * plate, no streak tag, no stamp. `--sign` (the shell's own navy) carries every accent
 * here, never a new blue — the wing's approved swatch names six colours and a blue is
 * not one of them.
 */
export function BlackFile({
  cards,
  pairs,
  seed,
  cursor = 0,
  total,
  fileSize,
}: {
  cards: FileCard[]
  pairs: PairCard[]
  seed: number
  cursor?: number
  total: number
  fileSize: number
}) {
  const [index, setIndex] = useState(0)
  const [hits, setHits] = useState(0)
  const [cardVerdict, setCardVerdict] = useState<CardVerdict | null>(null)
  const [pairVerdict, setPairVerdict] = useState<PairVerdict | null>(null)
  const [pending, startTransition] = useTransition()

  const step = index
  const inCards = step < cards.length
  const card = cards[step]
  const pair = pairs[step - cards.length]
  const done = !inCards && !pair
  const answered = cardVerdict !== null || pairVerdict !== null

  function answerCard(value: 'crossed' | 'did_not') {
    if (answered || !card) return
    startTransition(async () => setCardVerdict(await submitCard(card.id, value)))
  }

  function answerPair(id: string) {
    if (answered || !pair) return
    startTransition(async () => setPairVerdict(await submitPair(pair.aId, pair.bId, id)))
  }

  function next() {
    if (cardVerdict?.correct || pairVerdict?.correct) setHits((h) => h + 1)
    setCardVerdict(null)
    setPairVerdict(null)
    setIndex((i) => i + 1)
  }

  const asked = Math.min(step, total)

  return (
    // Same field as the duel, colder: no dot-grid warmth is added here beyond the
    // field itself, no red anywhere, no stamp. See the file header for why.
    <div className="relative -mx-gutter mt-stack overflow-hidden bg-hate-field px-gutter pb-6 pt-3">
      <div aria-hidden="true" className="hate-dots pointer-events-none absolute inset-0" />
      <div className="relative">
      {/* the away end's own header — navy, cold, nothing of ours in it */}
      <div className="flex items-end justify-between border-b-rule border-sign pb-2">
        <div>
          <p className="font-latin text-[9px] font-bold tracking-[0.2em] text-sign" dir="ltr">
            GATE · AWAY END
          </p>
          <p className="font-display text-step-1 leading-tight text-hate-ink">{t('derby.file')}</p>
        </div>
        <div className="text-end">
          <p className="font-poster text-[34px] leading-none text-sign">
            <Num>{hits}</Num>
          </p>
          <p className="font-body text-[10px] tracking-widest text-hate-muted">
            <Num>{asked}</Num> {t('derby.of')} <Num>{total}</Num>
          </p>
        </div>
      </div>

      {done ? (
        <Done hits={hits} total={total} fileSize={fileSize} seed={seed} cursor={cursor} />
      ) : inCards && card ? (
        <>
          <p className="mt-stack font-body text-[11px] tracking-widest text-hate-muted">
            {t('derby.crossQ')}
          </p>
          <div className="mt-2 border-rule border-sign bg-hate-card p-5 text-center">
            <p className="font-display text-step-3 leading-tight text-hate-ink">{card.subjectHe}</p>
          </div>

          {!answered ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => answerCard('crossed')}
                className="min-h-tap border-rule border-sign bg-sign px-3 font-body text-step-0 font-extrabold text-hate-ink transition-transform duration-press ease-stamp active:scale-[.96] disabled:opacity-50 motion-reduce:transition-none"
              >
                {t('derby.crossed')}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => answerCard('did_not')}
                className="min-h-tap border-rule border-sign bg-hate-ink/10 px-3 font-body text-step-0 font-extrabold text-sign transition-transform duration-press ease-stamp active:scale-[.96] disabled:opacity-50 motion-reduce:transition-none"
              >
                {t('derby.didNot')}
              </button>
            </div>
          ) : (
            cardVerdict && <Reveal verdict={cardVerdict} onNext={next} seed={seed} step={step} />
          )}
        </>
      ) : pair ? (
        <>
          <p className="mt-stack font-body text-[11px] tracking-widest text-hate-muted">
            {t('derby.firstQ')}
          </p>
          <div className="mt-2 grid gap-2">
            {[
              { id: pair.aId, title: pair.aTitleHe },
              { id: pair.bId, title: pair.bTitleHe },
            ].map((side) => (
              <button
                key={side.id}
                type="button"
                disabled={pending || answered}
                onClick={() => answerPair(side.id)}
                className={`min-h-tap w-full border-rule px-4 py-3 text-start font-display text-step-1 leading-tight transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none ${
                  pairVerdict && pairVerdict.firstId === side.id
                    ? 'border-sign bg-sign text-hate-ink'
                    : 'border-sign bg-hate-card text-hate-ink'
                }`}
              >
                {side.title}
              </button>
            ))}
          </div>
          {pairVerdict && (
            <div className="mt-3 border-rule border-sign bg-hate-card p-3">
              <p className="font-body text-step-0 font-extrabold text-hate-ink">
                {microFeedback(11, pairVerdict.correct ? 'correct' : 'wrong', seed, step)?.line}
              </p>
              <p className="mt-1 font-mono text-[11px] tabular-nums text-hate-muted">
                <bdi dir="ltr">{pairVerdict.aDate}</bdi> · <bdi dir="ltr">{pairVerdict.bDate}</bdi>
              </p>
              <button
                type="button"
                onClick={next}
                className="mt-3 flex min-h-tap w-full items-center justify-center bg-sign px-4 font-body text-step-0 font-extrabold text-hate-ink"
              >
                {t('derby.next')}
              </button>
            </div>
          )}
        </>
      ) : null}
      </div>
    </div>
  )
}

/** The reveal is the game. Being wrong here should teach you something true. */
function Reveal({ verdict, onNext, seed, step }: { verdict: CardVerdict; onNext: () => void; seed: number; step: number }) {
  return (
    <div className="mt-3 border-rule border-sign bg-hate-card p-4">
      <p className="font-body text-step-0 font-extrabold text-hate-ink">
        {microFeedback(11, verdict.correct ? 'correct' : 'wrong', seed, step)?.line}
      </p>
      {/* §20 — the entry: מי · מה קרה · מתי · מקור · למה זה בתיק. The dl under it keeps the figures. */}
      <dl className="mt-2 grid gap-1.5" data-blackfile="entry">
        {verdict.whoHe && <FileRow k={t('blackfile.who')} v={<span className="font-display text-step-1 leading-tight">{verdict.whoHe}</span>} />}
        <FileRow
          k={t('blackfile.what')}
          v={
            <>
              <span className="block font-display text-step-0 leading-tight">{verdict.titleHe}</span>
              <span className="mt-0.5 block font-body text-step--1 leading-relaxed text-hate-muted">{verdict.bodyHe}</span>
            </>
          }
        />
        <FileRow
          k={t('blackfile.when')}
          v={verdict.happenedOn ? <bdi dir="ltr" className="font-mono tabular-nums">{verdict.happenedOn}</bdi> : <span className="text-hate-muted">{t('blackfile.whenUnknown')}</span>}
        />
        <FileRow k={t('blackfile.source')} v={<SourceNote newTab tone="dark" group="team" />} />
        <FileRow k={t('blackfile.why')} v={t(`blackfile.why.${verdict.why}` as MessageKey)} />
      </dl>

      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
        {verdict.toClubHe && (
          <div>
            <dt className="font-body text-[10px] tracking-widest text-hate-muted">{t('derby.to')}</dt>
            <dd className="font-display text-step-0 text-hate-ink">{verdict.toClubHe}</dd>
          </div>
        )}
        {verdict.feeEur !== null && (
          <div>
            <dt className="font-body text-[10px] tracking-widest text-hate-muted">{t('derby.fee')}</dt>
            <dd className="font-poster text-[22px] leading-none text-sign">
              <Num>{`€${verdict.feeEur.toLocaleString('en-US')}`}</Num>
            </dd>
          </div>
        )}
      </dl>

      <button
        type="button"
        onClick={onNext}
        className="mt-4 flex min-h-tap w-full items-center justify-center bg-sign px-4 font-body text-step-0 font-extrabold text-hate-ink transition-transform duration-press ease-stamp active:scale-[.97] motion-reduce:transition-none"
      >
        {t('derby.next')}
      </button>
    </div>
  )
}

/**
 * The done screen — and, like every other graded gate, a way out through `ShareRow`.
 * `pct` is a real computation off `hits`/`total`, never a separate guess, which is what
 * rule 11/15 asks of a number printed on a card.
 */
function Done({
  hits,
  total,
  fileSize,
  seed,
  cursor,
}: {
  hits: number
  total: number
  fileSize: number
  seed: number
  cursor: number
}) {
  const pct = total > 0 ? Math.round((hits / total) * 100) : 0
  return (
    <div className="mt-stack border-rule border-sign bg-hate-card p-5 text-center">
      {/*
        The black file is the second room of GATE 11, not a gate of its own. Reporting
        under `/derby/file` wrote a key the wall has no plate for: `stillToDo` could never
        clear it, `cardFigures` counted it, and a device could print "8 מתוך 11" with seven
        plates lit. Its deck stays its own (`PlayLink gate="/derby/file"` — the two rooms
        deal different things); only the STATISTIC belongs to the gate. 17.9.2026.
      */}
      <RecordRun gate="/derby" score={hits} correct={hits} asked={total} />
      <p className="font-poster text-[74px] leading-none text-sign">
        <Num>{hits}</Num>
      </p>
      <p className="font-body text-step-0 text-hate-muted">
        {t('derby.of')} <Num>{total}</Num>
      </p>
      <p className="mt-3 font-body text-step--1 leading-relaxed text-hate-muted">
        {t('derby.fileNote', { count: String(fileSize) })}
      </p>
      {/* It was a hardcoded `?seed=12`, so every replay after the first was the same
          round, for ever. It now walks this device's own deck. */}
      <PlayLink
        gate="/derby/file"
        className="mt-4 flex min-h-tap w-full items-center justify-center bg-sign px-4 font-body text-step-0 font-extrabold text-hate-ink"
      >
        {t('derby.again')}
      </PlayLink>

      <ShareRow
        kind="file"
        params={{ s: String(seed), r: String(cursor), total: String(total) }}
        headline={String(hits)}
        card={{
          template: 'ink' as const,
          art: artFor('file', total > 0 ? hits / total : 0),
          kicker: 'GATE 11 · THE BLACK FILE',
          label: t('screen.derby.title'),
          eyebrow: t('derby.file'),
          hero: `${hits}/${total}`,
          bigStat: { v: `${pct}%`, k: t('derby.accuracy') },
          stats: [
            { k: t('run.right'), v: `${hits}/${total}` },
            { k: t('derby.fileStat'), v: String(fileSize) },
          ],
          cta: t('derby.fileCta'),
          challenge: t('share.sameRound'),
        }}
      />

      <AdSlot placement="result" />
    </div>
  )
}

/** one line of a black-file entry: the label in a fixed column, the record beside it */
function FileRow({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-2 border-b-hair border-hate-ink/20 pb-1.5">
      <dt className="font-body text-[10px] font-extrabold tracking-widest text-hate-muted">{k}</dt>
      <dd className="min-w-0 font-body text-[13px] text-hate-ink">{v}</dd>
    </div>
  )
}
