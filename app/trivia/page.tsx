import type { Metadata } from 'next'

import { ReportLink } from '@/components/ui/ReportLink'
import { Screen } from '@/components/ui/Screen'
import { eraChips, topicCounts } from '@/lib/game/trivia'
import { TOPICS, questionTopic, type Topic } from '@/lib/game/topics'
import { t } from '@/lib/i18n'
import { gateMetadata } from '@/lib/seo'
import { QuickPick, type EraChip } from './QuickPick'

/**
 * שער 2 — אגף הטריוויות, as Quick Pick.
 *
 * The counts and the era chips are READ from the Question Master, not written down and
 * not rebuilt: the old wall re-ran the whole bank five times on every visit to print
 * five numbers. A topic or an era that cannot fill a run is shown disabled with its
 * count, never dealt short.
 */
export const metadata: Metadata = gateMetadata('trivia')

export default function TriviaWingPage({ searchParams }: { searchParams: { pick?: string } }) {
  const eras = Object.fromEntries(TOPICS.map((topic) => [topic, eraChips(questionTopic(topic))])) as Record<
    Topic,
    EraChip[]
  >
  const pick = searchParams.pick
  const initial: { mode?: 'mix' | 'revenge' | 'surprise'; hard?: boolean } | undefined =
    pick === 'revenge' || pick === 'surprise'
      ? { mode: pick }
      : pick === 'hard'
        ? { mode: 'mix', hard: true }
        : undefined
  return (
    <Screen title={t('screen.trivia.title')} sub={t('screen.trivia.sub')} stage>
      <QuickPick counts={topicCounts()} eras={eras} initial={initial} />
      <div className="mt-2 hidden shrink-0 md:block">
        <ReportLink />
      </div>
    </Screen>
  )
}
