'use server'
import {requestClub} from '@/lib/clubs/request'
import {ratedPool,dealDraft,play,rumbleReadiness} from '@/lib/clubs/rumble'
import {opponentFor} from '@/lib/clubs/rumble-opponent'
import {stageMatch} from '@/lib/clubs/rumble-show'
import {lineupMatches,buildableKits,kitViews} from '@/lib/clubs/gate-content'
import {clubGoals,goalPool,cleanTouches,judgeGoal} from '@/lib/clubs/goal'
/** Answers never ship to the client: tenant, gate switch, content version are checked here on every grade. */
export async function gradeLineup(slug:string,version:string,matchId:string,picks:string[]){
 if(typeof slug!=='string'||slug.length>100||typeof version!=='string'||typeof matchId!=='string'||matchId.length>200||!Array.isArray(picks)||picks.length!==11||picks.some(p=>typeof p!=='string'||p.length>120))return null
 const resolved=await requestClub(slug,3)
 if(!resolved||resolved.data.version!==version||!resolved.data.gates.lineup?.playable)return null
 const m=lineupMatches(resolved.data).find(x=>x.id===matchId)
 if(!m)return null
 const set=new Set(picks)
 if(set.size!==11)return null
 const right=m.starters.filter(s=>set.has(s)),missed=m.starters.filter(s=>!set.has(s))
 return {correct:right.length,missed,wrong:picks.filter(p=>!m.starters.includes(p)),sources:m.sources}
}
export async function gradeKit(slug:string,version:string,kitId:string,season:string,maker:string,design:string){
 if([slug,version,kitId,season,maker,design].some(v=>typeof v!=='string'||v.length>120))return null
 const resolved=await requestClub(slug,4)
 if(!resolved||resolved.data.version!==version||!resolved.data.gates['kit-builder']?.playable)return null
 const k=buildableKits(resolved.data).find(x=>x.id===kitId)
 if(!k)return null
 return {season:k.season===season,maker:k.maker===maker,design:k.design===design,truth:{season:k.season,maker:k.maker,design:k.design},sources:k.sources}
}
export const kitCount=async(slug:string)=>{const r=await requestClub(slug,5);return r?kitViews(r.data).length:0}
/**
 * Gate 9 — the five are checked against the board the seed deals, the score is decided from hidden
 * ratings, and the match is staged HERE (`stageMatch`). Only public cards and the finished script leave.
 */
export async function playRumble(slug:string,version:string,seed:number,picks:string[],vs?:string,duel?:string){
 if(typeof slug!=='string'||slug.length>100||typeof version!=='string'||!Number.isSafeInteger(seed)||!Array.isArray(picks)||picks.length!==5||picks.some(p=>typeof p!=='string'||p.length>200)||(vs!==undefined&&(typeof vs!=='string'||vs.length>100))||(duel!==undefined&&typeof duel!=='string'))return null
 const resolved=await requestClub(slug,9)
 if(!resolved||resolved.data.version!==version||!resolved.data.gates['royal-rumble']?.playable)return null
 const pool=ratedPool(resolved.data),opponent=await opponentFor(slug,pool,vs,duel)
 if(!opponent)return null
 const r=play(pool,seed,picks,opponent)
 return r?{verdict:r.verdict,goals:r.goals,script:stageMatch(r,seed),rivalClub:opponent.kind==='locked'?opponent.club:opponent.kind==='club'?vs:slug}:null
}
export const rumbleDeal=async(slug:string,seed:number,vs?:string,duel?:string)=>{const r=await requestClub(slug,9);if(!r||!Number.isSafeInteger(seed))return null;const pool=ratedPool(r.data);if(!rumbleReadiness(pool).playable)return null;const o=await opponentFor(slug,pool,vs,duel);return o?dealDraft(pool,seed,o):null}
/** Gate 8 — the touches are graded here; the cast, verbs, order and count never left the server before this. */
export async function gradeClubGoal(slug:string,version:string,goalId:string,seed:number,touches:unknown){
 if(typeof slug!=='string'||slug.length>100||typeof version!=='string'||typeof goalId!=='string'||goalId.length>200||!Number.isSafeInteger(seed))return null
 const resolved=await requestClub(slug,8)
 if(!resolved||resolved.data.version!==version||!resolved.data.gates.goal?.playable)return null
 const g=clubGoals(resolved.data).find(x=>x.id===goalId)
 if(!g)return null
 const clean=cleanTouches(touches,goalPool(resolved.data,g,seed))
 if(!clean)return null
 const verdict=judgeGoal(g,clean)
 return {...verdict,truth:g.steps.map(s=>({actor:s.actor,action:s.action,zone:s.zone,note:s.note})),narrative:g.narrative,sources:g.sources.map(id=>{const s=resolved.data.sources.find(x=>x.id===id);return {title:s?.title||id,url:s?.url||null}})}
}
/** Paid hint: how many touches the report describes — never who, what or where. */
export async function clubGoalCount(slug:string,version:string,goalId:string){
 if(typeof slug!=='string'||typeof version!=='string'||typeof goalId!=='string'||goalId.length>200)return null
 const resolved=await requestClub(slug,8)
 if(!resolved||resolved.data.version!==version||!resolved.data.gates.goal?.playable)return null
 return clubGoals(resolved.data).find(x=>x.id===goalId)?.steps.length??null
}
