import {NextResponse} from 'next/server'
import {tick} from '@/lib/book/fulfil'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=120
/**
 * POST /api/book/tick — Broken Collective's heartbeat (pg_cron marketing:book-tick, every 5 minutes). It only does work a paid
 * order is already owed (send it to its maker, ask Lulu about its job, send the letter its step owes — each once, by state and
 * ledger), so it needs no secret; it also runs at most once a minute, so calling it in a loop changes nothing.
 */
let last=0,running=false
async function run(){
 if(running||Date.now()-last<60000)return NextResponse.json({skipped:true},{headers:{'Cache-Control':'no-store'}})
 running=true;last=Date.now()
 try{return NextResponse.json(await tick(),{headers:{'Cache-Control':'no-store'}})}
 finally{running=false}
}
export const POST=run
export const GET=run
