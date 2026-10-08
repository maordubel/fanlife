'use server'
import {requestClub} from '@/lib/clubs/request'
import {eligibleKits,dealKitRun,gradePuzzle,strikeFor,KIT_ROUND,HINT_LIMIT,STEP_ORDER,type Step,type Verdict} from '@/lib/clubs/kit-run'
import {signUnlock} from '@/lib/clubs/kit-unlock'

/**
 * Gate 4 server side. The client holds public puzzles only; the right card is recomputed here from the seed on every grade
 * (the deal is pure), so there is nothing to tamper with and nothing to leak. A stale content version or a closed gate comes
 * back as a NAMED failure the board can recover from — never a silent no-op.
 */
export type Fail={ok:false;error:'invalid'|'stale'|'locked'}
export type Graded={ok:true;verdict:Verdict;sources:{title:string;url:string|null}[];/** only a COMPLETE build opens the shirt in the collection (an empty grade is a peek, not a build) */unlock:{kitId:string;token:string}|null}
export type Struck={ok:true;optionId:string|null}

const int=(n:unknown,max:number)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=max
async function run(slug:unknown,version:unknown,seed:unknown,cursor:unknown):Promise<Fail|{ok:true;club:NonNullable<Awaited<ReturnType<typeof requestClub>>>['data'];deal:ReturnType<typeof dealKitRun>}>{
 if(typeof slug!=='string'||slug.length>100||typeof version!=='string'||version.length>80||!int(seed,1e9)||!int(cursor,1e6))return {ok:false,error:'invalid'}
 const resolved=await requestClub(slug,4)
 if(!resolved||!resolved.data.gates['kit-builder']?.playable)return {ok:false,error:'locked'}
 if(resolved.data.version!==version)return {ok:false,error:'stale'}
 return {ok:true,club:resolved.data,deal:dealKitRun(eligibleKits(resolved.data),seed as number,cursor as number,KIT_ROUND)}
}

export async function gradeKitShirt(slug:string,version:string,seed:number,cursor:number,index:number,picks:Record<string,string>,hints:number):Promise<Graded|Fail>{
 const r=await run(slug,version,seed,cursor)
 if(!r.ok)return r
 if(!int(index,KIT_ROUND-1)||!picks||typeof picks!=='object'||Object.keys(picks).length>STEP_ORDER.length||Object.values(picks).some(v=>typeof v!=='string'||v.length>40))return {ok:false,error:'invalid'}
 const verdict=gradePuzzle(r.deal,index,picks,hints)
 if(!verdict)return {ok:false,error:'invalid'}
 const sources=verdict.sources.map(id=>r.club.sources.find(s=>s.id===id)).filter((s):s is NonNullable<typeof s>=>!!s).slice(0,4).map(s=>({title:s.title,url:s.url}))
 return {ok:true,verdict,sources,unlock:verdict.steps.every(s=>s.chosen)?{kitId:verdict.kitId,token:signUnlock(slug,verdict.kitId)}:null}
}

/** A paid hint: one wrong card to strike on the open step. `nth` = how many were already struck on that step. */
export async function hintKitShirt(slug:string,version:string,seed:number,cursor:number,index:number,step:string,nth:number):Promise<Struck|Fail>{
 const r=await run(slug,version,seed,cursor)
 if(!r.ok)return r
 if(!int(index,KIT_ROUND-1)||!(STEP_ORDER as readonly string[]).includes(step)||!int(nth,HINT_LIMIT-1))return {ok:false,error:'invalid'}
 return {ok:true,optionId:strikeFor(r.deal,index,step as Step,nth)}
}
