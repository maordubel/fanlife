import type { Metadata } from 'next'

import { Screen } from '@/components/ui/Screen'
import { ReportLink } from '@/components/ui/ReportLink'
import { pickerRoster } from '@/lib/archive/player-master'
import { rosterIndex } from '@/lib/game/allTimeXI'
import { homeKits } from '@/lib/kit/seasons'
import { DEFAULT_SPEC } from '@/lib/kit/spec'
import { shirtBoard } from '@/lib/xi/board'
import { numberBoard } from '@/lib/polls/wore-server'
import { debateRoundView } from '@/lib/polls/debates-server'
import { roundFrom } from '@/lib/rotation/round'
import { gateMetadata } from '@/lib/seo'
import { t } from '@/lib/i18n'

import { BallotSheet } from './BallotSheet'
import { TerraceWing } from './TerraceWing'

export const metadata: Metadata = gateMetadata('polls')

/**
 * שער 7 — אגף הסקרים.
 *
 * The roster is built on the server, where the archive lives, and handed down as names
 * only — the same payload the all-time XI takes. Nothing about a ballot needs grading,
 * so the ballot has no seed and nothing to grade: this gate has no right answer, which
 * is the entire point of it. (The seed read below deals the DEBATES — see the note at
 * the end of this comment.)
 *
 * Two more payloads go down with it, and neither is new work: `shirtBoard` is the join
 * gate 1 already receives (`lib/xi/board.ts` — the seasons sent once, a player as two
 * fields), which is what lets the slip print the shirt a man is actually identified
 * with rather than a guess; and the club's own home kit, which is the garment the
 * supporter's own name and number are lettered onto. Both are reads of
 * `lib/kit/playerKit.ts` and `lib/kit/seasons.ts` — this gate builds no shirt of its own
 * and keeps no second roster (rule 1).
 *
 * And two since 21.9.2026: who wore each number, season-bound and sourced (the number
 * question's reaction — `lib/polls/wore-server.ts`), and the retired-slug map, so the
 * voter's own gate 1 eleven can be offered as shortcuts whatever key it was saved under.
 *
 * **28.9.2026 — two halves (ONE RED WORLD §16, P0.3).** The ballot above is הכרטיס שלי
 * and is unchanged. Beside it, הוויכוח של היציע: a rotating handful of opinion debates
 * from `content/manual/terrace-debates.json`, dealt by `?seed=` and `?r=` through the house
 * rotation, with list options read from the masters here on the server. So the gate now
 * does read a seed — for the debates only; the ballot still has none.
 */
export default function PollsPage({ searchParams = {} }: { searchParams?: { seed?: string; r?: string; tab?: string } }) {
  const roster = rosterIndex()
  const round = roundFrom(searchParams)
  const debate = debateRoundView(round.seed, round.cursor)
  return (
    <Screen title={t('screen.polls.title')} sub={t('screen.polls.sub')} stage>
      <TerraceWing
        initialTab={searchParams.tab === 'debate' ? 'debate' : 'card'}
        debates={debate.debates}
        roster={roster}
        slot={debate.slot}
        slices={debate.slices}
        ballot={
          <BallotSheet
            roster={roster}
            shirts={shirtBoard(roster)}
            shirt={homeKits()[0]?.spec ?? DEFAULT_SPEC}
            numbers={numberBoard()}
            slugAliases={pickerRoster().slugAliases}
          />
        }
      />
      <div className="mt-2 hidden shrink-0 md:block">
        <ReportLink />
      </div>
    </Screen>
  )
}
