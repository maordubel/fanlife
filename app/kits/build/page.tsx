import type { Metadata } from 'next'

import { EmptyState } from '@/components/ui/EmptyState'
import { Screen } from '@/components/ui/Screen'
import { dealKitRound, kitModeFrom, kitPuzzleCount, KIT_ROUND } from '@/lib/game/kitBuild'
import { t } from '@/lib/i18n'
import { playableKits } from '@/lib/kit/kit-master'
import { roundFrom } from '@/lib/rotation/round'
import { gateMetadata } from '@/lib/seo'

import { KitGameRun } from './KitGameRun'

export const metadata: Metadata = gateMetadata('kits-build')

/**
 * The Kit Master id of every shirt the archive holds an EXACT photograph of, by that photograph's
 * slug (`evidence.exactPhoto.file` without `.webp`) — for "יש לך אותה בבית?" on the reveal
 * (spec §42). A candidate photograph is a guess at a season (rule 69 §4) and is not a shirt a
 * collector can file. Keyed by the photograph, not by the season being dealt: the reveal learns
 * WHICH photograph from the verdict, after the check, so this map says nothing about the round
 * the client is about to play (rule 4).
 */
function exactKits(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const kit of playableKits()) {
    const photo = kit.evidence.exactPhoto
    if (photo) out[photo.file.replace(/\.webp$/, '')] = kit.id
  }
  return out
}

/**
 * שער 4 — חידון המדים. The whole glass belongs to the run (rule 21): no masthead, no tab bar,
 * one full-bleed screen the height of the phone (Maor's V14 layout). The round is dealt here, on
 * the server, and nothing the client receives says which option is right (rule 4).
 */
export default function KitGamePage({ searchParams }: { searchParams: { seed?: string; r?: string; n?: string; from?: string } }) {
  const round = roundFrom(searchParams)
  // `?n=3` Quick · `?n=5` Full (§13). No `n` = no choice yet: the gate opens on its line and asks.
  // A SHARED link with no `n` is the legacy form (`?seed=&r=k&from=share`, minted before the cursor
  // counted shirts): `r` names ROUND k of the old deal, played Full. Links shared now always carry
  // `n`. The wall's own links (`/tik`, no `from`) also lack `n` but count shirts — `from` tells them apart.
  const legacy = round.pinned && searchParams.n === undefined && searchParams.from === 'share'
  const mode = legacy ? 'full' : kitModeFrom(searchParams.n)
  if (kitPuzzleCount() < KIT_ROUND) {
    return (
      <Screen title={t('screen.kitgame.title')} sub={t('screen.kitgame.sub')} chrome={false}>
        <EmptyState title={t('empty.kits')} body={t('empty.kits.body')} />
      </Screen>
    )
  }
  const puzzles = dealKitRound(round.seed, round.cursor, undefined, legacy)
  return (
    <Screen title={t('screen.kitgame.title')} sub={t('screen.kitgame.sub')} chrome={false} stage>
      <KitGameRun puzzles={puzzles} seed={round.seed} cursor={round.cursor} mode={mode} legacy={legacy} exactKits={exactKits()} />
    </Screen>
  )
}
