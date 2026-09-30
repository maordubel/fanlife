import type { Metadata } from 'next'

import { EmptyState } from '@/components/ui/EmptyState'
import { Screen } from '@/components/ui/Screen'
import { buildRound, memoryEntityId } from '@/lib/game/memory'
import { chaptersOfEntity } from '@/lib/life/bridge'
import { archiveHref } from '@/lib/links'
import { recommend } from '@/lib/results/context'
import { roundFrom } from '@/lib/rotation/round'
import { t } from '@/lib/i18n'
import { gateMetadata } from '@/lib/seo'
import { MemoryBoard } from './MemoryBoard'

/** שער 6 — משחק הזיכרון: כל צמד הוא שתי פנים לעובדה אחת מהארכיון. */
export const metadata: Metadata = gateMetadata('memory')

export default function MemoryPage({
  searchParams,
}: {
  searchParams: { seed?: string; r?: string }
}) {
  const round = roundFrom(searchParams)
  const board = buildRound(round.seed, 6, round.cursor)

  // §15 — every pair that names an archive entity links to its card; the hrefs are resolved and
  // CHECKED here (lib/links), so the wall can never open on "not found"
  const links: Record<string, string> = {}
  const entities: string[] = []
  // §15 / §23.3 — the LIFE chapters each pair's entity is lived in. The device decides (its save);
  // the line shows only for a FINISHED chapter, and it never names a character
  const lived: Record<string, string[]> = {}
  for (const pair of board.pairs) {
    const id = memoryEntityId(pair.id)
    const href = id ? archiveHref(id) : null
    if (id && href) {
      links[pair.id] = href
      entities.push(id)
    }
    const chapters = id ? chaptersOfEntity(id) : []
    if (chapters.length) lived[pair.id] = chapters
  }
  // §6 / §38 — the exit's doors, from the same round: a goal on the wall is replayed in gate 8,
  // the wall's time is ordered in gate 13; the cards already on the mural are not offered twice
  const goalIds = board.pairs.flatMap((pair) => (pair.id.startsWith('goal:') ? [pair.id.slice('goal:'.length)] : []))
  const next = recommend(
    {
      gateId: 6,
      runId: `${round.seed}:${round.cursor}`,
      goalIds,
      weakTopics: ['history'],
      archiveEntityIds: entities,
    },
    { exclude: Object.values(links) },
  )

  return (
    <Screen title={t('screen.memory.title')} sub={t('screen.memory.sub')} night stage>
      {board.cards.length >= 4 ? (
        <MemoryBoard round={board} seed={round.seed} cursor={round.cursor} links={links} lived={lived} next={next} />
      ) : (
        <EmptyState title={t('empty.memory')} body={t('empty.memory.body')} />
      )}
    </Screen>
  )
}
