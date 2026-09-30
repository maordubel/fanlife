import type { Metadata } from 'next'

import { ThreadTabs } from '@/components/archive/ThreadTabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { ReportLink } from '@/components/ui/ReportLink'
import { Screen } from '@/components/ui/Screen'
import { dealTimelineRun, timelineAvailable } from '@/lib/game/timeline'
import { roundFrom } from '@/lib/rotation/round'
import { t } from '@/lib/i18n'
import { gateMetadata } from '@/lib/seo'
import { TimelineBoard } from '../TimelineBoard'
import { ThreadCoach } from '../ThreadCoach'

/**
 * שער 13 · מצב שני — סדר כרונולוגי.
 *
 * The chronology game that was gate 13 until 21.9.2026, kept as the gate's second mode
 * (owner decision). The anchor is dealt WITH its date; everything else arrives blind, and
 * `gradeInsert` derives the dates from the seed AND the cursor on the server.
 */
export const metadata: Metadata = gateMetadata('timeline-order')

export default function TimelineOrderPage({
  searchParams,
}: {
  searchParams: { seed?: string; r?: string }
}) {
  const round = roundFrom(searchParams)
  const available = timelineAvailable()
  const deal = available ? dealTimelineRun(round.seed, round.cursor) : null

  return (
    <Screen title={t('screen.timeline.title')} sub={t('screen.timeline.sub')} chrome={!available}>
      <div className="pt-1">
        <ThreadTabs active="order" />
      </div>
      {deal ? (
        <>
          <ThreadCoach />
          <TimelineBoard anchor={deal.anchor} queue={deal.queue} seed={round.seed} cursor={round.cursor} />
          <ReportLink />
        </>
      ) : (
        <EmptyState title={t('empty.timeline')} body={t('empty.timeline.body')} />
      )}
    </Screen>
  )
}
