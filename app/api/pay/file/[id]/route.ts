import {getOrder,owns,moveOrder} from '@/lib/pay/orders'
import {fileLink,putFile} from '@/lib/pay/files'
import {decode} from '@/lib/shop/personal/sign'
import {printPng} from '@/lib/shop/personal/render'
import type {SouvenirSpec} from '@/lib/shop/personal/souvenirs'
import type {XIPrintSpec} from '@/lib/shop/personal/xi-poster'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=120
/**
 * GET /api/pay/file/<order>?t=<token> — the paid print file. It was made and stored before the buyer was told it is ready, so
 * this is a five-minute signed link to the stored bytes: the download starts at once. An order fulfilled before the store
 * existed (16–17.11.2026) is drawn once now, stored, and handed over the same way.
 */
export async function GET(r:Request,{params}:{params:{id:string}}){
 const t=new URL(r.url).searchParams.get('t'),o=await getOrder(params.id)
 if(!owns(o,t)||o!.kind!=='print-file'||o!.status!=='fulfilled')return new Response('Not found',{status:404})
 let link=await fileLink(o!.id)
 if(!link){
  const rec=o!.recipe as {s?:string;sig?:string},spec=decode<XIPrintSpec|SouvenirSpec>(rec.s??null,rec.sig??null)
  if(!spec)return new Response('This file can no longer be drawn. Write to fanlife@dubelteam.com and we will send it.',{status:410})
  const stored=await putFile(o!.id,await printPng(spec));await moveOrder(o!.id,['fulfilled'],{result:{...(o!.result??{}),stored}})
  link=await fileLink(o!.id)
 }
 return link?Response.redirect(link,302):new Response('The file is not reachable right now. Try again in a minute.',{status:503})
}
