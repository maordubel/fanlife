import {NextRequest,NextResponse} from 'next/server'
import {operate,testerId} from '@/lib/master/evaluation-db'
import {sameOrigin,requireOpenEvaluation} from '@/lib/master/request'
export const dynamic='force-dynamic'
export async function POST(r:NextRequest){try{requireOpenEvaluation();sameOrigin(r);const raw=await r.text();if(raw.length>2000000)throw new Error('Request too large.');return NextResponse.json(await operate(JSON.parse(raw),testerId()),{headers:{'Cache-Control':'no-store'}})}catch(e){return NextResponse.json({data:null,error:{message:e instanceof Error?e.message:'Invalid request'}},{status:400})}}
