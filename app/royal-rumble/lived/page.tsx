import type { Metadata } from 'next'

import { Screen } from '@/components/ui/Screen'
import { allPlayers } from '@/lib/archive/player-master'
import { royalRumblePlayerCount } from '@/lib/game/royal-rumble'
import { t } from '@/lib/i18n'
import { wardrobe } from '@/lib/kit/playerShirt'
import { homeKits } from '@/lib/kit/seasons'
import { roundFrom } from '@/lib/rotation/round'

import { LivedRumble } from './LivedRumble'

/**
 * "השנים שחיית עד עכשיו" — the themed Royal Rumble (ONE RED WORLD §18).
 *
 * A separate mode on its own route, so it can never be mistaken for the gate's canonical
 * board: the draft is dealt by a server action from the LIFE chapters THIS DEVICE finished
 * (the save is local), over its own seed namespace. The page hands down only what every
 * visitor gets anyway — the kits and the wardrobe; until the device's chapters are read and
 * the server agrees the pool can deal a board, the screen says so and deals nothing.
 */
export const metadata: Metadata = {
  title: t('redworld.rumble.title'),
  description: t('redworld.rumble.lede'),
  robots: { index: false },
}

export default function LivedRumblePage({ searchParams }: { searchParams: { seed?: string; r?: string } }) {
  const round = roundFrom(searchParams)
  const kits = homeKits().map(({ seasonLabel, spec }) => ({ seasonLabel, spec }))
  const rows = new Map<string, { key: string; player: ReturnType<typeof allPlayers>[number] }>()
  for (const player of allPlayers()) for (const key of [player.slug, ...player.slugAliases]) rows.set(key, { key, player })
  const looks = wardrobe(rows.values())
  return (
    <Screen title={t('redworld.rumble.title')} sub={t('redworld.rumble.sub')} chrome={false} stage>
      <LivedRumble seed={round.seed} cursor={round.cursor} kits={kits} looks={looks} playerCount={royalRumblePlayerCount()} />
    </Screen>
  )
}
