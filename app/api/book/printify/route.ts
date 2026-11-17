import {NextResponse} from 'next/server'
import {handlePrintifyEvent} from '@/lib/book/fulfil'
import {printifySigned} from '@/lib/book/printify'

export const runtime='nodejs'
export const dynamic='force-dynamic'
/** POST /api/book/printify — Printify's webhooks for the book's store (registered by the server on the first order) */
export async function POST(r:Request){
 const raw=await r.text()
 if(!await printifySigned(raw,r.headers.get('x-pfy-signature')))return new NextResponse('bad signature',{status:401})
 await handlePrintifyEvent(JSON.parse(raw))
 return NextResponse.json({ok:true})
}
