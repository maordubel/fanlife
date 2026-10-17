import {NextResponse} from 'next/server'
import {countdownOf,readRoundLock} from '@/lib/promo/roundLock'
export const dynamic='force-dynamic'
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Cache-Control':'public, s-maxage=15, stale-while-revalidate=30'}
/** Live timers for the owner's apps: only those inside their window, with the server's clock so a wrong phone clock cannot show a wrong time. */
export async function GET(){
 const now=Date.now(),c=countdownOf(await readRoundLock(),now)
 return NextResponse.json({v:1,now,countdowns:c?[c]:[]},{headers:CORS})
}
export function OPTIONS(){return new NextResponse(null,{status:204,headers:CORS})}
