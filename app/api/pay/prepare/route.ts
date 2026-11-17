import {NextResponse} from 'next/server'
import {payOpen} from '@/lib/pay/stripe'
import {dropOld,makeFile,makeOwed} from '@/lib/pay/files'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=120
/**
 * POST /api/pay/prepare[?id=po_…] — the file maker's door (17.11.2026). With an id it makes that order's file if it is owed;
 * without one it makes every owed file (the minute cron, marketing:pay-files-make); with ?drop it lets files older than
 * 120 days leave the store (the daily cron, marketing:pay-files-drop). It only ever does work that a paid order is
 * already owed and holds a lease per order, so it needs no secret: calling it twice changes nothing.
 */
async function run(r:Request){
 if(!payOpen())return NextResponse.json({off:true},{status:503})
 const id=new URL(r.url).searchParams.get('id')
 const q=new URL(r.url).searchParams
 const out=id?{[id]:(await makeFile(id)).state}:q.has('drop')?{dropped:await dropOld()}:await makeOwed()
 return NextResponse.json(out,{headers:{'Cache-Control':'no-store'}})
}
export const POST=run
export const GET=run
