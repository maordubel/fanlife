import {getOrder,owns} from '@/lib/pay/orders'
import {decode} from '@/lib/shop/personal/sign'
import {renderXI,renderSouvenir} from '@/lib/shop/personal/render'
import {SOUVENIRS,type SouvenirSpec} from '@/lib/shop/personal/souvenirs'
import type {XIPrintSpec} from '@/lib/shop/personal/xi-poster'

export const runtime='nodejs'
export const dynamic='force-dynamic'
/** GET /api/pay/file/<order>?t=<token> — the paid print file, drawn full size from the order's signed recipe */
export async function GET(r:Request,{params}:{params:{id:string}}){
 const t=new URL(r.url).searchParams.get('t'),o=await getOrder(params.id)
 if(!owns(o,t)||o!.kind!=='print-file'||o!.status!=='fulfilled')return new Response('Not found',{status:404})
 const rec=o!.recipe as {s?:string;sig?:string},spec=decode<XIPrintSpec|SouvenirSpec>(rec.s??null,rec.sig??null)
 if(!spec)return new Response('This file can no longer be drawn — write to us and we will send it.',{status:410})
 const img='w' in spec&&(SOUVENIRS as readonly string[]).includes(spec.w)?await renderSouvenir(spec as SouvenirSpec,3):await renderXI(spec as XIPrintSpec,3,'print')
 return new Response(await img.arrayBuffer(),{headers:{'content-type':'image/png','content-disposition':`attachment; filename="fanlife-${o!.id}.png"`,'cache-control':'private, no-store'}})
}
