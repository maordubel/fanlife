import { notFound } from 'next/navigation'

import { ClubSurface } from '@/components/clubs/ClubSurface'
import { loadClub } from '@/lib/clubs/resolver'
import { clubTheme, themeStyle } from '@/lib/clubs/theme'
import { REGISTRY } from '@/lib/master/registry'
import { qaAllowed } from '@/lib/qa'
import en from '@/messages/life-universal/en.json'

import { Preview } from './Preview'

/**
 * QA only — LIFE's paper (THE WEEKLY dress, rule 124) with no world loading behind it: the HUD, the speech
 * balloon, a narration caption, the player's own line, the coupons, the tap chip, the menu, a card and a
 * small game, in any club's colours and rival lock. `notFound()` in production, like every page under /qa.
 * `?club=<id>&show=speech|narr|me|choices|tap|menu|card|game` — every line on it is a QA sample, not content.
 */
export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<{ club?: string; show?: string }> }) {
  if (!qaAllowed()) notFound()
  const sp = await searchParams
  const clubId = sp.club ?? 'hapoel-tel-aviv'
  const reg = REGISTRY.find((r) => r.id === clubId)
  if (!reg) notFound()
  const core = await loadClub(clubId)
  const theme = core?.data.theme || clubTheme(reg)
  return (
    <ClubSurface theme={theme} clubId={clubId} tabbar={false}>
      <Preview style={themeStyle(theme)} club={reg.name} initials={reg.initials} show={sp.show ?? 'speech'} copy={en as Record<string, string>} />
    </ClubSurface>
  )
}
