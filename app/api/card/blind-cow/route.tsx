import { ImageResponse } from 'next/og'

import { BlindCowCardArt } from '@/lib/og/cards'
import { ogFonts } from '@/lib/og/fonts'
import { CARD_SIZE, cleanSize, parseBlindCowCard } from '@/lib/og/params'

/**
 * /api/card/blind-cow?bm=…&bs=…&bh=…&bt=…[&bw&bd&by][&v=story] — the gate-10 result card
 * (delta 89). 1200×630 for the WhatsApp preview, `v=story` 1080×1350 for a shared file.
 * No name and no player id ever reach it (`lib/og/params.ts`).
 */
export const runtime = 'nodejs'

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const card = parseBlindCowCard(url.searchParams)
  if (!card) return new Response(null, { status: 404 })
  const size = cleanSize(url.searchParams.get('v'))
  return new ImageResponse(<BlindCowCardArt card={card} size={size} />, {
    ...CARD_SIZE[size],
    fonts: await ogFonts(),
    headers: { 'cache-control': 'public, max-age=86400, s-maxage=31536000, immutable' },
  })
}
