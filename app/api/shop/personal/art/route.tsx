import {decode} from '@/lib/shop/personal/sign'
import {printPng} from '@/lib/shop/personal/render'
import {SOUVENIRS,type SouvenirSpec} from '@/lib/shop/personal/souvenirs'
import type {Layout,XIPrintSpec} from '@/lib/shop/personal/xi-poster'
export const runtime='nodejs'
export const maxDuration=60
const LAYOUTS:Layout[]=['print','tee-back','tee-front','tee-proof']
/**
 * /api/shop/personal/art?s=…&sig=…[&l=tee-back|tee-front|tee-proof][&size=print] — a supporter's print, drawn from its signed
 * recipe: the proof on screen, or the file the printer takes (k=3). Drawn by printPng (satori + sharp, 17.11.2026): seconds
 * where next/og's renderer took minutes, the same pixels.
 */
export async function GET(r:Request){
 const u=new URL(r.url),raw=decode<XIPrintSpec|SouvenirSpec>(u.searchParams.get('s'),u.searchParams.get('sig')),k=u.searchParams.get('size')==='print'?3:0.6
 if(raw&&'w' in raw&&(SOUVENIRS as readonly string[]).includes(raw.w)){const img=await printPng(raw,{k})
  return new Response(new Uint8Array(img),{headers:{'content-type':'image/png','cache-control':'public, max-age=86400, immutable'}})}
 const spec=raw as XIPrintSpec|null
 if(!spec||!Array.isArray(spec.n)||spec.n.length!==11)return new Response(null,{status:404})
 const l=LAYOUTS.find(x=>x===u.searchParams.get('l'))??'print'
 const img=await printPng(spec,{k,layout:l})
 return new Response(new Uint8Array(img),{headers:{'content-type':'image/png','cache-control':'public, max-age=86400, immutable'}})
}
