import 'server-only'
import {requestClub} from '../request'
import {CORE_CLUB_IDS} from '../resolver'
import {REGISTRY} from '@/lib/master/registry'
import type {Rated} from '../rumble'
import {xiPool} from './pool'
import {canRival,rivalReason,xiReadiness} from './readiness'
import {FORMATION_IDS} from './formations'
import type {FormationId,XIReadiness} from './types'

export type RivalChoice={id:string;name:string;ok:boolean;reason:string|null}
export type XIHome={ready:XIReadiness;byFormation:Record<FormationId,XIReadiness>}

/** Which clubs can be the rival in this shape, and — for those that cannot — exactly why (never a silent omission). */
export async function rivalChoices(f:FormationId):Promise<RivalChoice[]>{
 const rows=await Promise.all(CORE_CLUB_IDS.map(async id=>{
  const name=REGISTRY.find(c=>c.id===id)?.name??id,r=await requestClub(id,9)
  if(!r||!r.data.gates['royal-rumble']?.playable)return {id,name,ok:false,reason:'gate closed'} satisfies RivalChoice
  const pool=xiPool(r.data)
  if(canRival(pool,f))return {id,name,ok:true,reason:null} satisfies RivalChoice
  return {id,name,ok:false,reason:rivalReason(pool,f)??`cannot field an eleven in ${f}`} satisfies RivalChoice
 }))
 return rows.sort((a,b)=>a.name.localeCompare(b.name))
}
/** A random rival is chosen by the round's own seed among the clubs that can field one, so a replay link meets the same club. */
export function pickRandomRival(choices:readonly RivalChoice[],home:string,seed:number):string|null{
 const ok=choices.filter(c=>c.ok&&c.id!==home);if(!ok.length)return null
 return ok[Math.abs(seed)%ok.length]!.id
}
export async function loadSides(slug:string,rival:string):Promise<{home:Rated[];away:Rated[];same:boolean;homeVersion:string}|null>{
 const h=await requestClub(slug,9);if(!h||!h.data.gates['royal-rumble']?.playable)return null
 const same=rival==='same'||rival===h.data.identity.id
 const a=same?h:await requestClub(rival,9);if(!a||!a.data.gates['royal-rumble']?.playable)return null
 return {home:xiPool(h.data),away:xiPool(a.data),same,homeVersion:h.data.version}
}
export const formationReadiness=(pool:readonly Rated[])=>Object.fromEntries(FORMATION_IDS.map(f=>[f,xiReadiness(pool,f)])) as Record<FormationId,XIReadiness>
