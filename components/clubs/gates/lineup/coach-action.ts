'use server'
import {requestClub} from '@/lib/clubs/request'
import {lineupMatches} from '@/lib/clubs/gate-content'
import {coachNote,type CoachNote} from '@/lib/clubs/lineup-model'

/**
 * The coach's note for gate 3 — computed where the answer lives. A kind and two numbers cross; never a name, never a band.
 * Tenant, gate switch and content version are checked on every call, like the grade.
 */
export async function askLineupCoach(slug:string,version:string,matchId:string,names:string[],index:number):Promise<CoachNote|null>{
 if(typeof slug!=='string'||slug.length>100||typeof version!=='string'||typeof matchId!=='string'||matchId.length>200||!Array.isArray(names)||names.length>11||names.some(n=>typeof n!=='string'||n.length>120)||!Number.isInteger(index))return null
 const resolved=await requestClub(slug,3)
 if(!resolved||resolved.data.version!==version||!resolved.data.gates.lineup?.playable)return null
 const m=lineupMatches(resolved.data).find(x=>x.id===matchId)
 return m?coachNote(m,names,index):null
}
