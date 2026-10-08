'use server'
import {requestClub} from '@/lib/clubs/request'
import {kitViews} from '@/lib/clubs/gate-content'
import {gate4Playable,isBuildable,openKit,type OpenKit} from '@/lib/clubs/kit-collection'
import {verifyUnlock} from '@/lib/clubs/kit-unlock'
import {DNA_THRESHOLD} from '@/lib/clubs/kit-rules'

/**
 * Gate 5 server side. The browser holds the build tokens gate 4 minted; it sends them here and gets the facts of exactly the
 * shirts the SERVER confirms were assembled. A forged or foreign token opens nothing, and a locked shirt's facts never travel.
 */
export type Opened={ok:true;kits:OpenKit[]}|{ok:false;error:'invalid'|'locked'}
const MAX_ENTRIES=80

/** a build as the browser kept it: the proof the server minted, and what the proof was minted for */
export type Entry={id:string;t:string;f:number;o:number;r:string}
export async function openBuiltKits(slug:string,entries:Entry[]):Promise<Opened>{
 if(typeof slug!=='string'||slug.length>100||!Array.isArray(entries)||entries.length>MAX_ENTRIES)return {ok:false,error:'invalid'}
 const resolved=await requestClub(slug,5)
 if(!resolved)return {ok:false,error:'locked'}
 const data=resolved.data
 if(!gate4Playable(data))return {ok:true,kits:[]}
 const byId=new Map(kitViews(data).map(k=>[k.id,k]))
 const kits=entries.flatMap(e=>{
  if(!e||typeof e.id!=='string'||e.id.length>120)return []
  const k=byId.get(e.id)
  return k&&isBuildable(data,k)&&Number.isInteger(e.f)&&e.f>=DNA_THRESHOLD&&Number.isInteger(e.o)&&typeof e.r==='string'&&verifyUnlock(slug,k.id,{f:e.f,o:e.o,r:e.r},e.t)?[k]:[]
 })
 // one receipt opens one shirt: however many times it is posted, a kit appears once
 return {ok:true,kits:[...new Map(kits.map(k=>[k.id,k])).values()].map(k=>openKit(data,k))}
}
