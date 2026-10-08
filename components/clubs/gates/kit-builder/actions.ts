'use server'
import {requestClub} from '@/lib/clubs/request'
import {eligibleKits,dealKitRun,gradePuzzle,strikeFor,KIT_ROUND,HINT_LIMIT,RULES,STEP_ORDER,type HintReceipt,type KitGame,type Step,type Verdict} from '@/lib/clubs/kit-run'
import {signHint,signUnlock,verifyHint} from '@/lib/clubs/kit-unlock'

/**
 * Gate 4 server side. The client holds public puzzles only; the right card is recomputed here from the seed on every grade
 * (the deal is pure), so there is nothing to tamper with and nothing to leak. A stale content version or a closed gate comes
 * back as a NAMED failure the board can recover from — never a silent no-op.
 *
 * A hint is a SIGNED receipt (club · puzzle · step · strike number · struck card). The grade counts the distinct receipts it
 * can verify — at most three — so a client cannot claim fewer hints than it spent, nor spend one hint twice, nor carry
 * another puzzle's receipt. The shirt opens in the collection (the DNA unlock) only at 75 field points or more, before any
 * hint penalty or perfect bonus, and the receipt it mints records how many documented parts that grade covered.
 */
export type Fail={ok:false;error:'invalid'|'stale'|'locked'}
export type Unlock={kitId:string;token:string;f:number;o:number;r:string}
export type Graded={ok:true;verdict:Verdict;sources:{title:string;url:string|null}[];unlock:Unlock|null}
export type Struck={ok:true;optionId:string|null;receipt:HintReceipt|null}
type RunGame=Exclude<KitGame,'recognition'>

const int=(n:unknown,max:number)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=max
async function run(slug:unknown,version:unknown,seed:unknown,cursor:unknown,game:unknown):Promise<Fail|{ok:true;club:NonNullable<Awaited<ReturnType<typeof requestClub>>>['data'];deal:ReturnType<typeof dealKitRun>}>{
 if(typeof slug!=='string'||slug.length>100||typeof version!=='string'||version.length>80||!int(seed,1e9)||!int(cursor,1e6)||(game!=='assembly'&&game!=='practice'))return {ok:false,error:'invalid'}
 const resolved=await requestClub(slug,4)
 if(!resolved||!resolved.data.gates['kit-builder']?.playable)return {ok:false,error:'locked'}
 if(resolved.data.version!==version)return {ok:false,error:'stale'}
 return {ok:true,club:resolved.data,deal:dealKitRun(eligibleKits(resolved.data),seed as number,cursor as number,KIT_ROUND,game as RunGame)}
}

/** the distinct hint receipts of THIS puzzle that the server itself signed */
function validHints(slug:string,deal:ReturnType<typeof dealKitRun>,index:number,receipts:unknown):number{
 const d=deal[index];if(!d||!Array.isArray(receipts))return 0
 const seen=new Set<string>()
 for(const r of receipts.slice(0,HINT_LIMIT*STEP_ORDER.length) as Partial<HintReceipt>[]){
  if(!r||typeof r.step!=='string'||!(STEP_ORDER as readonly string[]).includes(r.step)||!int(r.nth,HINT_LIMIT-1)||typeof r.optionId!=='string'||r.optionId.length>40)continue
  const {step,nth,optionId}=r as {step:Step;nth:number;optionId:string}
  if(strikeFor(deal,index,step,nth)!==optionId||!verifyHint(slug,d.puzzle.id,step,nth,optionId,r.r))continue
  seen.add(`${step}|${nth}`)
 }
 return Math.min(HINT_LIMIT,seen.size)
}

export async function gradeKitShirt(slug:string,version:string,seed:number,cursor:number,game:string,index:number,picks:Record<string,string>,receipts:HintReceipt[]):Promise<Graded|Fail>{
 const r=await run(slug,version,seed,cursor,game)
 if(!r.ok)return r
 if(!int(index,KIT_ROUND-1)||!picks||typeof picks!=='object'||Object.keys(picks).length>STEP_ORDER.length||Object.values(picks).some(v=>typeof v!=='string'||v.length>40))return {ok:false,error:'invalid'}
 const verdict=gradePuzzle(r.deal,index,picks,validHints(slug,r.deal,index,receipts))
 if(!verdict)return {ok:false,error:'invalid'}
 const sources=verdict.sources.map(id=>r.club.sources.find(s=>s.id===id)).filter((s):s is NonNullable<typeof s>=>!!s).slice(0,4).map(s=>({title:s.title,url:s.url}))
 const out={f:verdict.fieldPoints,o:verdict.scored,r:RULES}
 return {ok:true,verdict,sources,unlock:verdict.dna?{kitId:verdict.kitId,token:signUnlock(slug,verdict.kitId,out),...out}:null}
}

/** A paid hint: one wrong card to strike on the open step. `nth` = how many were already struck on that step. */
export async function hintKitShirt(slug:string,version:string,seed:number,cursor:number,game:string,index:number,step:string,nth:number):Promise<Struck|Fail>{
 const r=await run(slug,version,seed,cursor,game)
 if(!r.ok)return r
 if(!int(index,KIT_ROUND-1)||!(STEP_ORDER as readonly string[]).includes(step)||!int(nth,HINT_LIMIT-1))return {ok:false,error:'invalid'}
 const optionId=strikeFor(r.deal,index,step as Step,nth),d=r.deal[index]
 return {ok:true,optionId,receipt:optionId&&d?{step:step as Step,nth,optionId,r:signHint(slug,d.puzzle.id,step,nth,optionId)}:null}
}
