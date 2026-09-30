import { ImageResponse } from 'next/og'

import { decodeChallenge } from '@/lib/challenges/resolve'
import { ChallengeCardArt } from '@/lib/og/challenge'
import { ogFonts } from '@/lib/og/fonts'
import { CARD_SIZE, cleanSize } from '@/lib/og/params'

/**
 * /api/card/challenge?c=<code>[&v=story] — the preview of a challenge link (Share V2).
 * Draws only what the whitelist decodes: numbers and closed words, never a name.
 */
export const runtime = 'nodejs'

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const challenge = decodeChallenge(url.searchParams.get('c'))
  if (!challenge) return new Response(null, { status: 404 })
  const size = cleanSize(url.searchParams.get('v'))
  return new ImageResponse(<ChallengeCardArt challenge={challenge} size={size} />, {
    ...CARD_SIZE[size],
    fonts: await ogFonts(),
    headers: { 'cache-control': 'public, max-age=86400, s-maxage=31536000, immutable' },
  })
}
