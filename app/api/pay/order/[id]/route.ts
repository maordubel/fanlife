import {NextResponse} from 'next/server'
import {getOrder,owns} from '@/lib/pay/orders'
import {makeFile} from '@/lib/pay/files'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=120
const no={'Cache-Control':'no-store'}
/**
 * GET /api/pay/order/<id>?t=<token> — where the buyer's order stands, for his order page (17.11.2026). While a print file is
 * owed this request is itself a maker: the buyer's own page drives the file to ready (seconds), the lease keeps it single.
 */
export async function GET(r:Request,{params}:{params:{id:string}}){
 const t=new URL(r.url).searchParams.get('t'),o=await getOrder(params.id).catch(()=>null)
 if(!owns(o,t))return NextResponse.json({status:'missing'},{status:404,headers:no})
 let status=o!.status
 if(status==='paid'&&o!.kind==='print-file'){const m=await makeFile(o!.id);if(m.state==='ready')status='fulfilled';else if(m.state==='failed')status='failed'}
 return NextResponse.json({status},{headers:no})
}
