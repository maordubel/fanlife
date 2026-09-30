import type { Metadata } from 'next'

import { ReportLink } from '@/components/ui/ReportLink'
import { Screen } from '@/components/ui/Screen'
import { dealQueue, rosterSize } from '@/lib/game/hate'
import { gateMetadata } from '@/lib/seo'
import { roundFrom } from '@/lib/rotation/round'
import { t } from '@/lib/i18n'
import { HateWall } from './HateWall'

/**
 * שער 11 — הקיר השחור.
 *
 * The server deals the QUEUE — ten names and which of them come without mercy — never
 * the duels: who holds the wall in round seven depends on round six. The queue must be
 * deterministic for a `?seed=` link (or a typed WALL code) to hand over the same wall,
 * and `round.pinned` is how the screen knows a wall came from somebody else.
 */
export const metadata: Metadata = gateMetadata('derby')

export default function HatePage({ searchParams }: { searchParams: { seed?: string; r?: string } }) {
  const round = roundFrom(searchParams)
  const { enemies, order, noMercy } = dealQueue(round.seed, round.cursor)
  return (
    <Screen title={t('screen.derby.title')} sub={t('screen.derby.sub')} chrome={false}>
      <HateWall
        enemies={enemies}
        order={order}
        noMercy={noMercy}
        seed={round.seed}
        cursor={round.cursor}
        pinned={round.pinned}
        rosterSize={rosterSize()}
      />
      <div className="mt-2 hidden md:block">
        <ReportLink />
      </div>
    </Screen>
  )
}
