import {NextResponse} from 'next/server'
import {retryStuck} from '@/lib/book/fulfil'
import {cronAuthorized} from '@/lib/master/request'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=120
/**
 * POST /api/book/retry — every 10 minutes from GitHub Actions (Bearer CRON_SECRET): paid book orders that have not reached
 * Lulu or Printify are tried again from their Stripe session. Answers 200 with the list; the workflow goes red when an
 * order has waited more than 30 minutes, so a stuck order is seen.
 */
export async function POST(r:Request){
 if(!cronAuthorized(r))return new NextResponse('unauthorized',{status:401})
 return NextResponse.json(await retryStuck())
}
