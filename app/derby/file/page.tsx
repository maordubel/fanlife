import type { Metadata } from 'next'

import { Screen } from '@/components/ui/Screen'
import { ReportLink } from '@/components/ui/ReportLink'
import { dealFile, dealPairs, fileSize } from '@/lib/game/blackfile'
import { gateMetadata } from '@/lib/seo'
import { roundFrom } from '@/lib/rotation/round'
import { t } from '@/lib/i18n'
import { BlackFile } from './BlackFile'

/**
 * שער 11, מערכה שנייה — התיק השחור.
 *
 * The hate bracket is the gate's front room and this is what is behind it: once you
 * have named your number one, the file asks whether you actually know the record. Two
 * acts in one gate is the answer to "it's finished after one game" — the second act is
 * only worth playing BECAUSE the first one got you angry.
 *
 * Navy only. No vermilion on this screen: whoever walks in is standing in somebody
 * else's end. It is a GAME, not a form (rule 21) — `chrome={false}`, same as the duel
 * — so the away end's own header and the dead-grass field it sits on (drawn inside
 * `BlackFile.tsx`) are the whole screen, and the result screen carries its own
 * `AdSlot` rather than relying on the masthead's reading slot.
 */
export const metadata: Metadata = gateMetadata('derby-file')

export default function BlackFilePage({
  searchParams,
}: {
  searchParams: { seed?: string; r?: string }
}) {
  const round = roundFrom(searchParams)
  const cards = dealFile(round.seed, round.cursor)
  const pairs = dealPairs(round.seed, undefined, round.cursor)
  // The total is counted from what this seed actually deals, never a declared
  // constant — see the note above `dealFile` in lib/game/blackfile.ts for the bug that
  // taught us this (rule 11/15: never print a number that is not true).
  const total = cards.length + pairs.length
  return (
    <Screen title={t('screen.file.title')} sub={t('screen.file.sub')} chrome={false}>
      <BlackFile
        cards={cards}
        pairs={pairs}
        seed={round.seed}
        cursor={round.cursor}
        total={total}
        fileSize={fileSize()}
      />
      <ReportLink />
    </Screen>
  )
}
