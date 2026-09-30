import type { Metadata } from 'next'

import { Screen } from '@/components/ui/Screen'
import { royalRumbleRoundDrafts, royalRumblePlayerCount } from '@/lib/game/royal-rumble'
import { royalRumbleMatchSeed } from '@/lib/game/royal-rumble-seeds'
import { allPlayers } from '@/lib/archive/player-master'
import { homeKits } from '@/lib/kit/seasons'
import { wardrobe } from '@/lib/kit/playerShirt'
import { t } from '@/lib/royal-rumble/i18n'
import { roundFrom } from '@/lib/rotation/round'
import { ArenaEntrance } from '@/components/gates/ArenaEntrance'
import { RoyalRumbleMatchFX } from './RoyalRumbleMatchFX'
import { RoyalRumbleMode } from './RoyalRumbleMode'

export const metadata: Metadata = { title: t('title'), description: t('description') }

export default function RoyalRumblePage({ searchParams }: { searchParams: { seed?: string; r?: string; room?: string } }) {
  const round = roundFrom(searchParams)
  // the cursor is part of the round (ONE RED WORLD §18): `seed=X&r=1` is another board
  const { draft, shuffleDraft } = royalRumbleRoundDrafts(round.seed, round.cursor)
  const matchSeed = royalRumbleMatchSeed(draft.seed)
  const count = royalRumblePlayerCount()
  const kits = homeKits().map(({ seasonLabel, spec }) => ({ seasonLabel, spec }))
  // every man's REAL shirt, by any slug he answers to (delta 88 — "אסור שיהיה שחקן ללא חולצה")
  // V2 wraps every card as `{ player, offeredAs }` (spec §5) — the wardrobe wants the man
  const dealt = [...draft.slots, ...shuffleDraft.slots].flatMap((slot) => slot.offers.map((offer) => offer.player))
  const rows = new Map<string, { key: string; player: string | ReturnType<typeof allPlayers>[number] }>()
  for (const player of allPlayers()) for (const key of [player.slug, ...player.slugAliases]) rows.set(key, { key, player })
  for (const player of dealt) if (!rows.has(player.slug)) rows.set(player.slug, { key: player.slug, player: player.nameHe })
  const looks = wardrobe(rows.values())
  return (
    <Screen title={t('title')} sub={t('sub')} chrome={false} stage>
      <ArenaEntrance logo="royal-rumble" />
      <RoyalRumbleMatchFX />
      <RoyalRumbleMode draft={draft} shuffleDraft={shuffleDraft} matchSeed={matchSeed} cursor={round.cursor} roundSeed={round.seed} playerCount={count} kits={kits} looks={looks} initialRoomCode={searchParams.room} />
    </Screen>
  )
}
