import { ImageResponse } from 'next/og'

import { GoalCardArt } from '@/lib/og/cards'
import { ogFonts } from '@/lib/og/fonts'
import { goalArt } from '@/lib/og/goal-art'
import { CARD_SIZE, cleanSize, parseGoalCard } from '@/lib/og/params'

/**
 * /api/card/goal?cg=<goalId>&ca=<avg>&cb=<best>&cs=<score>[&v=story] — the gate-8 result
 * card (delta 89): the goal, your accuracy, and the scorer's real shirt of that season.
 */
export const runtime = 'nodejs'

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const card = parseGoalCard(url.searchParams)
  if (!card) return new Response(null, { status: 404 })
  const art = await goalArt(card, url.origin)
  if (!art) return new Response(null, { status: 404 })
  const size = cleanSize(url.searchParams.get('v'))
  return new ImageResponse(<GoalCardArt art={art} size={size} />, {
    ...CARD_SIZE[size],
    fonts: await ogFonts(),
    headers: { 'cache-control': 'public, max-age=86400, s-maxage=31536000, immutable' },
  })
}
