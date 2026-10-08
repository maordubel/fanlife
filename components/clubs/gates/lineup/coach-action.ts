'use server'
import {requestClub} from '@/lib/clubs/request'
import {lineupMatches} from '@/lib/clubs/gate-content'
import {buildPool,coachNote,isBand,matchYear,type CoachNote} from '@/lib/clubs/lineup-model'

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

export type SheetVerdict={correct:number;missed:string[];wrong:string[];sources:string[];/** the archive records no bands for this match, so none is graded */bandGraded:false}
/**
 * Gate 3 grading with the rulebook's input rules (LI-R08): exactly eleven rows, each man once, each from this match's
 * dealt room, each in a real band. A forged or malformed sheet is REFUSED whole — nothing is silently dropped and then graded
 * as if it were valid. Bands are checked for shape only: the archive records who started, not where each man stood.
 */
export async function gradeLineupSheet(slug:string,version:string,matchId:string,rows:{name:string;band:string}[]):Promise<SheetVerdict|null>{
 if(typeof slug!=='string'||slug.length>100||typeof version!=='string'||typeof matchId!=='string'||matchId.length>200||!Array.isArray(rows)||rows.length!==11)return null
 if(rows.some(r=>!r||typeof r.name!=='string'||r.name.length>120||!isBand(r.band)))return null
 const names=rows.map(r=>r.name)
 if(new Set(names).size!==11)return null
 const resolved=await requestClub(slug,3)
 if(!resolved||resolved.data.version!==version||!resolved.data.gates.lineup?.playable)return null
 const m=lineupMatches(resolved.data).find(x=>x.id===matchId)
 if(!m)return null
 const pool=buildPool({matchId:m.id,starters:m.starters,decoys:m.decoys,roster:(resolved.data.players||[]).map(p=>p.value),year:matchYear(m.on)})
 if(!names.every(n=>pool.includes(n)))return null
 const set=new Set(names)
 return {correct:m.starters.filter(s=>set.has(s)).length,missed:m.starters.filter(s=>!set.has(s)),wrong:names.filter(n=>!m.starters.includes(n)),sources:m.sources,bandGraded:false}
}
