import { notFound } from 'next/navigation'
import SharedGatePage from '@/app/clubs/[slug]/[gate]/page'
import { telegramGame, knownClub } from '@/lib/telegram/routes'
import { readState } from '@/lib/master/store'
import { gateAccess } from '@/lib/clubs/access'
import type { GateSearch } from '@/components/clubs/gates/types'

export const dynamic = 'force-dynamic'

/** Import the canonical page, not a fork: rules, rendering, content and server actions stay identical. */
export default async function TelegramGate({ params, searchParams }: { params: { club: string; gate: string }; searchParams: GateSearch }) {
  const game = telegramGame(params.gate)
  if (!game || !knownClub(params.club)) notFound()
  const state = await readState()
  if (!gateAccess(state.clubs.find(club => club.id === params.club), game.number, false).allowed) notFound()
  return SharedGatePage({ params: { slug: params.club, gate: game.key }, searchParams: { ...searchParams, lang: 'en' } })
}
