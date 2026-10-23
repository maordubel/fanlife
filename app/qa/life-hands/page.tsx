import { notFound } from 'next/navigation'

import { ClubSurface } from '@/components/clubs/ClubSurface'
import { loadClub } from '@/lib/clubs/resolver'
import { clubTheme, themeStyle } from '@/lib/clubs/theme'
import { JOB_HANDS } from '@/lib/life/universal/hands'
import { REGISTRY } from '@/lib/master/registry'
import { qaAllowed } from '@/lib/qa'

import { Preview } from './Preview'

/**
 * QA only — every job you do with your hands, standalone (`lib/life/universal/hands.ts`).
 * `notFound()` in production, like every page under /qa. `?club=<id>&id=job-crates&age=12`
 * opens one job in that club's colours; the links walk all of them for the screenshot script.
 * `&scope=short` opens the short version; `&people=Dad,Mum,Ofir` puts those people in the photograph.
 */
export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<{ club?: string; id?: string; age?: string; scope?: string; people?: string }> }) {
  if (!qaAllowed()) notFound()
  const sp = await searchParams
  const clubId = sp.club ?? 'hapoel-tel-aviv'
  const reg = REGISTRY.find((r) => r.id === clubId)
  if (!reg) notFound()
  const core = await loadClub(clubId)
  const theme = core?.data.theme || clubTheme(reg)
  const ids = [...Object.keys(JOB_HANDS), 'r-ter-stencil', 'scarf-stitch', 'f20-photo', 'drawer-pull', 'packet-open', 'packet-tear', 'letter-open', 'wardrobe-lend', 'S02:wear', 'scarf-tie', 'laces-tie', 'armband-tie', 'swap-check', 'S07:me', 'S38:check', 'tyre-fix', 'chair-leg-fix', 'chain-fix']
  const id = ids.includes(sp.id ?? '') ? sp.id! : ids[0]!
  const age = Number(sp.age ?? 24) || 24
  const scope = sp.scope === 'short' ? 'short' : 'full'
  const people = (sp.people ?? '').split(',').map((n) => n.trim()).filter(Boolean).slice(0, 5)
  // dressed like every page (rule 91): the club's surface, with no tab bar on a proofing stand
  return (
    <ClubSurface theme={theme} clubId={clubId} tabbar={false}>
      <Preview style={themeStyle(theme)} club={clubId} id={id} age={age} ids={ids} scope={scope} people={people} />
    </ClubSurface>
  )
}
