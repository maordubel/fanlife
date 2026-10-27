import {NextResponse} from 'next/server'
import {hubDecision, hubOpenClubs} from '@/lib/universe/hub'

/**
 * GET /api/universe/companion — the matchday card's re-check (CF-05). A card left open in a tab, or a tab coming back from
 * the background, asks whether its promise is still the one the hub would make now. Only the action id and its deadline:
 * nothing about the visitor is sent or kept.
 */
export const dynamic = 'force-dynamic'
export async function GET() {
  const d = await hubDecision(await hubOpenClubs().catch(() => [])).catch(() => null)
  const a = d?.selected?.action ?? null
  return NextResponse.json(a ? {id: a.id, family: a.family, expiresAt: a.expiresAt} : {id: null}, {headers: {'Cache-Control': 'no-store'}})
}
