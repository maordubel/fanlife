import {NextResponse} from 'next/server'
import {handleLuluStatus} from '@/lib/book/fulfil'
import {luluSigned,type Job} from '@/lib/book/lulu'

export const runtime='nodejs'
export const dynamic='force-dynamic'
/** POST /api/book/lulu — Lulu's PRINT_JOB_STATUS_CHANGED webhook (signed with the API secret). Moves the order, sends "on its way". */
export async function POST(r:Request){
 const raw=await r.text()
 if(!luluSigned(raw,r.headers.get('lulu-hmac-sha256')))return new NextResponse('bad signature',{status:401})
 const ev=JSON.parse(raw) as {topic?:string;data?:Job}
 if(ev.topic==='PRINT_JOB_STATUS_CHANGED'&&ev.data?.id)await handleLuluStatus(ev.data)
 return NextResponse.json({ok:true})
}
