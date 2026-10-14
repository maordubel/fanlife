import 'server-only'
import {fileArea} from '@/lib/master/files'
import {cleanDoc} from './rules'
import {SEED_DOC} from './seed'
import type {PromoDoc} from './types'

const area=fileArea('promo'),FILE='banners.json'
/** What the site shows. A store that refuses, or a file that cannot be read, is the seed — advertising never closes a screen (rule 105). */
export async function readPromo():Promise<PromoDoc>{
 try{const r=await area.read(FILE);if(!r)return SEED_DOC;return cleanDoc(JSON.parse(r.text),(JSON.parse(r.text).audit??[]).slice(-50))}catch{return SEED_DOC}
}
/** The control room's save: validated whole, written compare-and-swap, one audit line. */
export async function savePromo(raw:unknown,by:string,what:string):Promise<PromoDoc>{
 const next=cleanDoc(raw)
 return area.update<PromoDoc>(FILE,SEED_DOC,cur=>({...next,audit:[...(cur.audit??[]),{at:new Date().toISOString(),by,what:what.slice(0,160)}].slice(-50)}))
}
export const promoStoreKind=()=>area.kind()
