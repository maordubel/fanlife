import {NextRequest,NextResponse} from 'next/server'
import {cronAuthorized} from '@/lib/master/request'
import {adminFromRequest} from '@/lib/master/admin'
import {backupLines} from '@/lib/master/backup'
export const dynamic='force-dynamic'
export const maxDuration=60
/** The scheduler (CRON_SECRET) or the signed-in owner. The workflow encrypts what it receives before storing it. */
export async function GET(r:NextRequest){
 if(!cronAuthorized(r)&&!adminFromRequest(r))return NextResponse.json({error:'Unauthorized'},{status:401,headers:{'Cache-Control':'no-store'}})
 const it=backupLines(),enc=new TextEncoder()
 let first:string
 try{const n=await it.next();if(n.done)throw new Error('empty');first=n.value}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Backup failed'},{status:503,headers:{'Cache-Control':'no-store'}})}
 const stream=new ReadableStream<Uint8Array>({
  start(c){c.enqueue(enc.encode(first))},
  async pull(c){try{const n=await it.next();if(n.done)c.close();else c.enqueue(enc.encode(n.value))}catch(e){c.error(e)}},
 })
 return new NextResponse(stream,{headers:{'Content-Type':'application/x-ndjson','Content-Disposition':`attachment; filename="fan-life-backup-${new Date().toISOString().slice(0,10)}.jsonl"`,'Cache-Control':'no-store'}})
}
