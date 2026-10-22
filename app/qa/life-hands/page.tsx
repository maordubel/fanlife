import { notFound } from 'next/navigation'

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
 */
export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<{ club?: string; id?: string; age?: string }> }) {
  if (!qaAllowed()) notFound()
  const sp = await searchParams
  const clubId = sp.club ?? 'hapoel-tel-aviv'
  const reg = REGISTRY.find((r) => r.id === clubId)
  if (!reg) notFound()
  const core = await loadClub(clubId)
  const theme = core?.data.theme || clubTheme(reg)
  const ids = [...Object.keys(JOB_HANDS), 'r-ter-stencil', 'scarf-stitch', 'f20-photo']
  const id = ids.includes(sp.id ?? '') ? sp.id! : ids[0]!
  const age = Number(sp.age ?? 24) || 24
  return <Preview style={themeStyle(theme)} club={clubId} id={id} age={age} ids={ids} />
}
