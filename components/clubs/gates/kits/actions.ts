'use server'
import {requestClub} from '@/lib/clubs/request'
import {kitViews} from '@/lib/clubs/gate-content'
import {gate4Playable,isBuildable,openKit,type OpenKit} from '@/lib/clubs/kit-collection'
import {verifyUnlock} from '@/lib/clubs/kit-unlock'

/**
 * Gate 5 server side. The browser holds the build tokens gate 4 minted; it sends them here and gets the facts of exactly the
 * shirts the SERVER confirms were assembled. A forged or foreign token opens nothing, and a locked shirt's facts never travel.
 */
export type Opened={ok:true;kits:OpenKit[]}|{ok:false;error:'invalid'|'locked'}
const MAX_ENTRIES=80

export async function openBuiltKits(slug:string,entries:{id:string;t:string}[]):Promise<Opened>{
 if(typeof slug!=='string'||slug.length>100||!Array.isArray(entries)||entries.length>MAX_ENTRIES)return {ok:false,error:'invalid'}
 const resolved=await requestClub(slug,5)
 if(!resolved)return {ok:false,error:'locked'}
 const data=resolved.data
 if(!gate4Playable(data))return {ok:true,kits:[]}
 const byId=new Map(kitViews(data).map(k=>[k.id,k]))
 const kits=entries.flatMap(e=>{
  if(!e||typeof e.id!=='string'||e.id.length>120)return []
  const k=byId.get(e.id)
  return k&&isBuildable(data,k)&&verifyUnlock(slug,k.id,e.t)?[openKit(data,k)]:[]
 })
 return {ok:true,kits}
}
