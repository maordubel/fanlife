import {decode} from '@/lib/shop/personal/sign'
import {renderXI} from '@/lib/shop/personal/render'
import type {Layout,XIPrintSpec} from '@/lib/shop/personal/xi-poster'
export const runtime='nodejs'
export const maxDuration=60
const LAYOUTS:Layout[]=['print','tee-back','tee-front','tee-proof']
/**
 * /api/shop/personal/art?s=…&sig=…[&l=tee-back|tee-front|tee-proof][&size=print] — a supporter's print, drawn from its signed
 * recipe: the proof on screen, or the file the printer takes (k=3).
 */
export async function GET(r:Request){
 const u=new URL(r.url),spec=decode<XIPrintSpec>(u.searchParams.get('s'),u.searchParams.get('sig'))
 if(!spec||!Array.isArray(spec.n)||spec.n.length!==11)return new Response(null,{status:404})
 const l=LAYOUTS.find(x=>x===u.searchParams.get('l'))??'print'
 const img=await renderXI(spec,u.searchParams.get('size')==='print'?3:0.6,l)
 return new Response(await img.arrayBuffer(),{headers:{'content-type':'image/png','cache-control':'public, max-age=86400, immutable'}})
}
