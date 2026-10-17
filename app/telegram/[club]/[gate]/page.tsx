import { notFound } from 'next/navigation'
import SharedGatePage from '@/app/clubs/[slug]/[gate]/page'
import { telegramGame, knownClub } from '@/lib/telegram/routes'
import { readState } from '@/lib/master/store'
import { gateAccess } from '@/lib/clubs/access'
import type { GateSearch } from '@/components/clubs/gates/types'
import SharedTimelinePage from '@/app/clubs/[slug]/timeline/page'
import SharedLifePage from '@/app/clubs/[slug]/life/page'

export const dynamic = 'force-dynamic'

/** Import the canonical page, not a fork: rules, rendering, content and server actions stay identical. */
export default async function TelegramGate({ params, searchParams }: { params: { club: string; gate: string }; searchParams: GateSearch }) {
  const game = telegramGame(params.gate)
  if ((!game && params.gate !== 'life') || !knownClub(params.club)) notFound()
  const state = await readState()
  if (params.gate === 'life') {
    const control = state.clubs.find(club => club.id === params.club)
    if (control?.status !== 'live') notFound()
    return SharedLifePage({ params: { slug: params.club }, searchParams: { lang: 'en' } })
  }
  if (!game) notFound()
  if (!gateAccess(state.clubs.find(club => club.id === params.club), game.number, false).allowed) notFound()
  if (game.key === 'timeline') return SharedTimelinePage({ params: { slug: params.club }, searchParams: { ...searchParams, lang: 'en' } })
  return SharedGatePage({ params: { slug: params.club, gate: game.key }, searchParams: { ...searchParams, lang: 'en' } })
}
