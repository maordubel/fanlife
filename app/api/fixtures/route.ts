import {NextResponse} from 'next/server'
import {getFixtureFeed} from '@/lib/fixtures/service'

export const dynamic = 'force-dynamic'
/** The live "next match" feed. Open /api/fixtures to see exactly what the provider returned, per club. */
export async function GET() {
  const feed = await getFixtureFeed()
  return NextResponse.json(feed, {headers: {'cache-control': 'public, s-maxage=3600, stale-while-revalidate=21600'}})
}
