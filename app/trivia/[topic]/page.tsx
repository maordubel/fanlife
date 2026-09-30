import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { EmptyState } from '@/components/ui/EmptyState'
import { ReportLink } from '@/components/ui/ReportLink'
import { Screen } from '@/components/ui/Screen'
import { roundFrom } from '@/lib/rotation/round'
import { resolveTopic, questionTopic, topicSpec } from '@/lib/game/topics'
import { ROUND_LENGTH, dealSeededRun, publicQuestions } from '@/lib/game/trivia'
import { t, type MessageKey } from '@/lib/i18n'
import { gateMetadata, topicMetadata } from '@/lib/seo'
import { TriviaRun, type RunMode } from '../TriviaRun'

export function generateMetadata({ params }: { params: { topic: string } }): Metadata {
  const topic = resolveTopic(params.topic)
  if (!topic) return gateMetadata('trivia')
  const spec = topicSpec(topic)
  return topicMetadata(spec.titleKey as MessageKey, spec.bladeKey as MessageKey, topic)
}

const QID = /^q_[0-9a-f]{12}$/

/**
 * שער 2 — one run.
 *
 * The route is the run's address. A topic is a route segment (the old five stay as
 * aliases — `/trivia/terrace-songs` plays the songs topic); an era is `?era=1990`, Hard is
 * `?hard=1`, practice is `?practice=1`. A seeded run is dealt here from (spec, seed,
 * cursor); a personal run (Revenge, Surprise, or a friend's link to one) arrives as its
 * twelve ids in `?q=`. Either way the twelve are dealt on the server WITHOUT answers.
 */
export default function TopicRoundPage({
  params,
  searchParams,
}: {
  params: { topic: string }
  searchParams: {
    seed?: string
    r?: string
    era?: string
    hard?: string
    practice?: string
    q?: string
    mode?: string
    rv?: string
  }
}) {
  const topic = resolveTopic(params.topic)
  if (!topic) notFound()
  const round = roundFrom(searchParams)
  const spec = topicSpec(topic)
  const era = /^(19|20)\d0$/.test(searchParams.era ?? '') ? Number(searchParams.era) : null
  const hard = searchParams.hard === '1'
  const practice = searchParams.practice === '1'
  const q = (searchParams.q ?? '')
    .split('.')
    .filter((id) => QID.test(id))
    .slice(0, ROUND_LENGTH)
  const personal = q.length > 0
  const mode: RunMode = searchParams.mode === 'revenge' || searchParams.mode === 'surprise' ? searchParams.mode : 'mix'
  const revengeCount = mode === 'revenge' && /^\d+$/.test(searchParams.rv ?? '') ? Number(searchParams.rv) : null

  const ids = personal ? q : dealSeededRun({ topic: questionTopic(topic), decade: era, hard }, round.seed, round.cursor).ids
  const questions = publicQuestions(ids, round.seed)
  const full = questions.length >= ROUND_LENGTH

  return (
    <Screen title={t(spec.titleKey as MessageKey)} sub={t('screen.trivia.sub')} chrome={!full}>
      {full ? (
        <>
          <TriviaRun
            questions={questions}
            seed={round.seed}
            cursor={round.cursor}
            topic={topic}
            era={era}
            hard={hard}
            practice={practice}
            mode={mode}
            personal={personal}
            revengeCount={revengeCount}
          />
          <ReportLink />
        </>
      ) : (
        <EmptyState
          title={t(spec.titleKey as MessageKey)}
          body={t('topic.thin', { n: String(questions.length), need: String(ROUND_LENGTH) })}
        />
      )}
    </Screen>
  )
}
