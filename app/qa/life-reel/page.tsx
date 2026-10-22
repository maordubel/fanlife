import { notFound } from 'next/navigation'

import { ClubSurface } from '@/components/clubs/ClubSurface'
import { loadClub } from '@/lib/clubs/resolver'
import { clubTheme, themeStyle } from '@/lib/clubs/theme'
import { REGISTRY } from '@/lib/master/registry'
import { qaAllowed } from '@/lib/qa'

import { Preview } from './Preview'

/**
 * QA only — the chapter reel standing on the shots photographed in the club's own world
 * (`public/life/town/shots.js`). `notFound()` in production, like every page under /qa.
 * `?club=<id>` uses that club's colours and stills; `?club=…&shots=0` shows the code-drawn fallback.
 */
export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<{ club?: string; shots?: string }> }) {
  if (!qaAllowed()) notFound()
  const sp = await searchParams
  const clubId = sp.club ?? 'hapoel-tel-aviv'
  const reg = REGISTRY.find((r) => r.id === clubId)
  if (!reg) notFound()
  const core = await loadClub(clubId)
  const theme = core?.data.theme || clubTheme(reg)
  // dressed like every page (rule 91): the club's surface, with no tab bar on a proofing stand
  return (
    <ClubSurface theme={theme} clubId={clubId} tabbar={false}>
      <Preview style={themeStyle(theme)} club={sp.shots === '0' ? null : clubId} />
    </ClubSurface>
  )
}
