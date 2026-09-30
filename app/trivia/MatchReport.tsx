'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { AdSlot } from '@/components/ads/AdSlot'
import { Punch } from '@/components/play/Punch'
import { RecordRun } from '@/components/play/RecordRun'
import { UniversalExit } from '@/components/result/UniversalExit'
import { CompareCard } from '@/components/share/CompareCard'
import { ShareRow } from '@/components/share/ShareRow'
import { Num } from '@/components/ui/Num'
import { Q_TYPES } from '@/lib/game/questions/types'
import { LIVES, RUN_LENGTH, type Session } from '@/lib/game/session'
import { nextChallenges, reportOf, tierFor, type AnswerLog } from '@/lib/game/trivia-report'
import { topicSpec, type Topic } from '@/lib/game/topics'
import type { ChallengeResult } from '@/lib/challenges/contract'
import { slipCard } from '@/lib/share/artefacts'
import { pendingRevenge, readMarks } from '@/lib/profile/marks'
import { pushMarks } from '@/lib/portal/marks-sync'
import { track } from '@/lib/analytics/meter'
import { t, type MessageKey } from '@/lib/i18n'
import type { NextAction, ResultContext } from '@/lib/results/types'
import { voice, type ResultTier } from '@/lib/voice'
import { nextAfterRun } from './actions'
import type { RunMode } from './TriviaRun'

/** the report's six tiers, in the Red Voice's five words (§11: high / medium / low) */
const VOICE_TIER: Record<string, ResultTier> = { perfect: 'perfect', great: 'high', good: 'high', wild: 'mid', rough: 'low', out: 'low' }

/** The run as a ResultContext (§5): what happened, which topics held and which slipped. */
export function triviaContext(log: readonly AnswerLog[], score: number, seed: number, cursor: number, personal: boolean): ResultContext {
  const byTopic = new Map<string, { right: number; asked: number }>()
  for (const entry of log) {
    const row = byTopic.get(entry.topic) ?? { right: 0, asked: 0 }
    row.asked += 1
    if (entry.correct) row.right += 1
    byTopic.set(entry.topic, row)
  }
  const rows = [...byTopic.entries()].sort(([a], [b]) => a.localeCompare(b))
  return {
    gateId: 2,
    runId: personal ? `q:${log.length}` : `${seed}:${cursor}`,
    score,
    strengths: rows.filter(([, r]) => r.asked >= 2 && r.right === r.asked).map(([topic]) => topic),
    weakTopics: rows.filter(([, r]) => r.asked - r.right > r.right).map(([topic]) => topic),
  }
}

/**
 * דוח משחק — Quick Pick's Match Report.
 *
 * The headline says how the night went in the terrace's words; under it the four figures
 * (score, x/12, best combo, lamps left), the six types one by one, and the four lines a
 * supporter actually repeats: the best streak, the hardest question cracked, the sharpest
 * topic, and how many questions are now waiting for revenge. Then two suggestions, the
 * same twelve again IN PLACE, and the way back to the lobby.
 *
 * The share link is the run: a seeded run shares `?seed=&r=` on its own route; a
 * personal run (Revenge, Surprise) shares its twelve ids as `?q=`, because the message
 * promises "אותן שאלות בדיוק" and a seed alone could not keep that promise.
 */
export function MatchReport({
  session,
  log,
  seed,
  cursor,
  topic,
  era,
  hard,
  practice,
  mode,
  personal,
  ids,
  revengeCount,
  onAgain,
}: {
  session: Session
  log: AnswerLog[]
  seed: number
  cursor: number
  topic: Topic
  era: number | null
  hard: boolean
  practice: boolean
  mode: RunMode
  personal: boolean
  ids: string[]
  revengeCount: number | null
  onAgain: () => void
}) {
  const [pending, setPending] = useState(0)
  const [next, setNext] = useState<NextAction[]>([])
  // the result emits its ResultContext; the server answers with at most two doors (§38)
  useEffect(() => {
    if (practice) return
    const context = triviaContext(log, session.score, seed, cursor, personal)
    track('run_complete', { detail: 'trivia', value: session.correct })
    let live = true
    nextAfterRun({ context, wrong: log.filter((entry) => !entry.correct).map((entry) => entry.id) })
      .then((answer) => {
        if (live) setNext(answer.next)
      })
      .catch(() => {})
    return () => {
      live = false
    }
    // one run, one context: the log is final when the report mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    const marks = readMarks()
    setPending(pendingRevenge(marks).length)
    // this run's answers up to the account, when there is one — silent otherwise
    const mine = Object.fromEntries(log.map((entry) => [entry.id, marks[entry.id]]).filter(([, mark]) => mark))
    const topics = new Map(log.map((entry) => [entry.id, entry.topic]))
    void pushMarks(mine, (id) => topics.get(id) ?? null)
  }, [log])

  const asked = log.length
  const tier = tierFor(session.correct, RUN_LENGTH, session.lives)
  const report = reportOf(log)
  const share = asked > 0 ? session.correct / RUN_LENGTH : 0
  const suggestions = nextChallenges({ pending, share, mode, hard })

  // the link that hands over THIS run
  const query = new URLSearchParams()
  if (personal) query.set('q', ids.join('.'))
  if (era !== null) query.set('era', String(era))
  if (hard) query.set('hard', '1')
  const route = `/trivia/${personal ? 'general' : topic}${query.toString() ? `?${query.toString()}` : ''}`

  // the twelve as ticks — the challenge's result and the slip's row of marks (§28)
  const challengeMarks = Array.from({ length: RUN_LENGTH }, (_, i) => log[i]?.correct ?? false)
  const mine: ChallengeResult = { gate: 2, marks: challengeMarks }
  const topicLabel = t(topicSpec(personal ? 'general' : topic).titleKey as MessageKey)

  const strongest = report.strongest ? t(`trivia.lobby.topic.${report.strongest}` as MessageKey) : '—'
  const spoken = voice({ gate: 2, moment: 'result', result: VOICE_TIER[tier] ?? 'mid', seed: `${seed}:${cursor}`, vars: { n: String(session.correct) } })

  // "תן לי 12 אחרים" — the same deck's next twelve (§1.4: new, not random)
  const otherQuery = new URLSearchParams({ seed: String(seed), r: String(cursor + 1) })
  if (era !== null) otherQuery.set('era', String(era))
  if (hard) otherQuery.set('hard', '1')
  const otherRoute = `/trivia/${topic}?${otherQuery.toString()}`

  return (
    <div className="mt-stack animate-slam">
      <Punch />
      {!practice && <RecordRun gate="/trivia" score={session.score} correct={session.correct} asked={RUN_LENGTH} />}
      {!practice && !personal && <CompareCard gate={2} mine={mine} />}

      <UniversalExit
        voice={spoken}
        next={next}
        from="trivia"
        again={{ label: t('voice.g2.cta.again'), onClick: onAgain }}
        share={
          practice ? undefined : (
            <ShareRow
              kind="trivia"
              params={{ s: String(seed), r: personal ? '0' : String(cursor), total: String(RUN_LENGTH) }}
              route={route}
              headline={String(session.correct)}
              card={slipCard({ topic: topicLabel, marks: challengeMarks })}
              challenge={personal ? undefined : { gate: 2, params: { topic, ...(era !== null && { era }), hard }, result: mine }}
            />
          )
        }
      >
        {revengeCount !== null && (
          <p className="mt-2 text-center font-body text-[12px] text-muted">
            {t('trivia.report.revengeRun', { n: String(revengeCount), m: String(Math.max(0, RUN_LENGTH - revengeCount)) })}
          </p>
        )}

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <Tile label={t('run.score')} value={practice ? '—' : String(session.score)} />
        <Tile label={t('run.right')} value={`${session.correct}/${RUN_LENGTH}`} />
        <Tile label={t('trivia.report.combo')} value={`×${session.bestCombo}`} />
        <Tile label={t('trivia.report.lamps')} value={`${Math.max(0, session.lives)}/${LIVES}`} />
      </div>

      <ul className="mt-2 grid grid-cols-2 gap-1.5 min-[480px]:grid-cols-3">
        {Q_TYPES.map((type) => {
          const row = report.byType.find((entry) => entry.type === type)
          return (
            <li key={type} className="flex items-baseline justify-between gap-2 border-rule border-ink/40 bg-sheet px-2.5 py-2">
              <span className="font-body text-[12px] font-bold text-ink">{t(`trivia.type.${type}` as MessageKey)}</span>
              <span className="font-mono text-[12px] tabular-nums text-muted">
                <Num>{row ? `${row.right}/${row.asked}` : '—'}</Num>
              </span>
            </li>
          )
        })}
      </ul>

      <dl className="mt-2 border-rule border-ink bg-sheet px-3 py-1">
        <Line k={t('trivia.report.streak')} v={String(report.bestStreak)} />
        <Line k={t('trivia.report.hardest')} v={report.hardest ? t('trivia.pill.difficulty', { d: String(report.hardest) }) : t('trivia.report.none')} />
        <Line k={t('trivia.report.topic')} v={strongest} />
        <Line k={t('trivia.report.revenge')} v={String(pending)} />
      </dl>

      {suggestions.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {suggestions.map((kind) => (
            <Link
              key={kind}
              href={kind === 'hard' ? '/trivia?pick=hard' : kind === 'mix' ? '/trivia' : `/trivia?pick=${kind}`}
              className="flex min-h-[64px] flex-col justify-center border-rule border-ink bg-paper px-3 py-2"
            >
              <span className="font-display text-step-1 leading-tight text-ink">{t(`trivia.next.${kind}` as MessageKey)}</span>
              <span className="font-body text-[12px] text-muted">
                {t(`trivia.next.${kind}.sub` as MessageKey, { n: String(pending) })}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-2 grid grid-cols-2 gap-2">
        {!personal && (
          <Link
            href={otherRoute}
            className="flex min-h-tap items-center justify-center border-rule border-ink bg-paper px-3 font-body text-step-0 font-extrabold text-ink"
          >
            {t('voice.g2.cta.other')}
          </Link>
        )}
        <Link
          href="/trivia"
          className={`flex min-h-tap items-center justify-center border-rule border-ink bg-ink px-3 font-body text-step-0 font-extrabold text-paper ${personal ? 'col-span-2' : ''}`}
        >
          {t('trivia.report.lobby')}
        </Link>
      </div>
      </UniversalExit>

      <p className="mt-2 text-center font-mono text-[11px] tabular-nums text-muted">
        <bdi dir="ltr">
          seed {seed}
          {cursor > 0 && !personal ? `·${cursor}` : ''}
          {personal ? ' · q' : ''}
        </bdi>
      </p>

      <AdSlot placement="result" />
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-rule border-ink bg-sheet px-1.5 py-2.5 text-center">
      <p className="font-poster text-[24px] leading-none text-ink">
        <Num>{value}</Num>
      </p>
      <p className="mt-1 font-body text-[11px] leading-tight text-muted">{label}</p>
    </div>
  )
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b-hair border-ink/20 py-2 last:border-b-0">
      <dt className="font-body text-step--1 text-ink">{k}</dt>
      <dd className="font-display text-step-1 leading-none text-ink">
        <Num>{v}</Num>
      </dd>
    </div>
  )
}
