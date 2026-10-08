'use server'
import {requestClub} from '@/lib/clubs/request'
import {qaAllowed} from '@/lib/qa'
import {blackFileSource} from '@/lib/clubs/gate-extras'
import {dealFile,gradeCrossingBy,gradeOrderBy,scopeOf,type CrossingReveal,type FileDeal,type OrderReveal,type Source,type SourceRef} from '@/lib/clubs/blackfile-deal'
import {fixtureBinary,fixtureItems} from '@/lib/clubs/rivalry-fixture'

/**
 * Gate 11 · Black File — the server half. Every call re-resolves the tenant, re-deals the file from (seed, cursor) and
 * grades by an opaque key, so the browser never holds an answer, a path or a date before it has chosen (BF-R06).
 */
const FIXTURE='__fixture'
type Bound={src:Source;lookup:(id:string)=>SourceRef|null;scope:string}

async function bound(slug:string,version:string,seed:number,cursor:number):Promise<Bound|null>{
 if(typeof slug!=='string'||slug.length>100||typeof version!=='string'||!Number.isSafeInteger(seed)||seed<=0||!Number.isSafeInteger(cursor)||cursor<0)return null
 if(slug===FIXTURE){
  if(!qaAllowed())return null
  return {src:{binary:fixtureBinary(),items:fixtureItems()},lookup:()=>({title:'Synthetic fixture — not a real source',url:null,publisher:'Fixture'}),scope:scopeOf(FIXTURE,'fixture',seed,cursor)}
 }
 const resolved=await requestClub(slug,11)
 if(!resolved||resolved.data.version!==version)return null
 const club=resolved.data,sources=new Map(club.sources.map(s=>[s.id,s]))
 return {src:await blackFileSource(club),lookup:id=>{const s=sources.get(id);return s?{title:s.title,url:s.url,publisher:s.publisher}:null},scope:scopeOf(club.identity.id,club.version,seed,cursor)}
}
const okKey=(k:unknown):k is string=>typeof k==='string'&&k.length>0&&k.length<=40

export async function gradeCrossing(slug:string,version:string,seed:number,cursor:number,key:string,said:string):Promise<CrossingReveal|null>{
 if(!okKey(key)||typeof said!=='string')return null
 const b=await bound(slug,version,seed,cursor);if(!b)return null
 const deal:FileDeal=dealFile(b.src,seed,cursor)
 return gradeCrossingBy(deal,b.scope,key,said,b.lookup)
}

export async function gradeOrder(slug:string,version:string,seed:number,cursor:number,pairKey:string,pickKey:string):Promise<OrderReveal|null>{
 if(!okKey(pairKey)||!okKey(pickKey))return null
 const b=await bound(slug,version,seed,cursor);if(!b)return null
 const deal:FileDeal=dealFile(b.src,seed,cursor)
 return gradeOrderBy(deal,b.scope,pairKey,pickKey,b.lookup)
}
