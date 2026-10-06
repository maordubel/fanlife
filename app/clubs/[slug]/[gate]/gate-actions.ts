'use server'
import {requestClub} from '@/lib/clubs/request'
import {ratedPool,dealDraft,play,rumbleReadiness} from '@/lib/clubs/rumble'
import {lineupMatches,buildableKits,kitViews} from '@/lib/clubs/gate-content'
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
export async function playRumble(slug:string,version:string,seed:number,picks:string[]){
 if(typeof slug!=='string'||slug.length>100||typeof version!=='string'||!Number.isSafeInteger(seed)||!Array.isArray(picks)||picks.length!==5||picks.some(p=>typeof p!=='string'||p.length>200))return null
 const resolved=await requestClub(slug,9)
 if(!resolved||resolved.data.version!==version||!resolved.data.gates['royal-rumble']?.playable)return null
 const r=play(ratedPool(resolved.data),seed,picks)
 return r?{verdict:r.verdict,goals:r.goals,you:{power:r.you.power,cost:r.you.cost,names:r.you.cards.map(c=>c.name)},rival:{power:r.rival.power,names:r.rival.cards.map(c=>c.name)}}:null
}
export const rumbleDeal=async(slug:string,seed:number)=>{const r=await requestClub(slug,9);return r&&Number.isSafeInteger(seed)&&rumbleReadiness(ratedPool(r.data)).playable?dealDraft(ratedPool(r.data),seed):null}
