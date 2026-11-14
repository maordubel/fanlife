import {decode} from '@/lib/shop/personal/sign'
import {renderXI} from '@/lib/shop/personal/render'
import type {XIPrintSpec} from '@/lib/shop/personal/xi-poster'
export const runtime='nodejs'
export const maxDuration=60
/** /api/shop/personal/art?s=…&sig=…[&size=print] — a supporter's print, drawn from its signed recipe (the proof on screen, or the 3600×4800 file). */
export async function GET(r:Request){
 const u=new URL(r.url),spec=decode<XIPrintSpec>(u.searchParams.get('s'),u.searchParams.get('sig'))
 if(!spec||!Array.isArray(spec.n)||spec.n.length!==11)return new Response(null,{status:404})
 const img=await renderXI(spec,u.searchParams.get('size')==='print'?3:0.6)
 return new Response(await img.arrayBuffer(),{headers:{'content-type':'image/png','cache-control':'public, max-age=86400, immutable'}})
}
