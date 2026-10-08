'use server'
import {requestClub} from '@/lib/clubs/request'
import {qaAllowed} from '@/lib/qa'
import {FIXTURE_CLUB,bindFixture,bindThread,levelByRef,planFor,type ThreadBinding} from '@/lib/clubs/thread-data'
import {closeRoute,failReveal,settle,tryMove,type Action,type CloseReason,type ClosedEdge,type MoveVerdict,type PublicCard} from '@/lib/clubs/thread-engine'
import type {SourceRef} from '@/lib/clubs/blackfile-deal'

/**
 * Gate 13 · Thread — the server half. Every call re-resolves the tenant and re-derives the level from the seed, so a
 * stale or foreign payload fails closed; the browser holds cards and rules only (TH-R11).
 */
async function bound(slug:string,version:string):Promise<ThreadBinding|null>{
 if(typeof slug!=='string'||slug.length>100||typeof version!=='string')return null
 if(slug===FIXTURE_CLUB)return qaAllowed()?bindFixture():null
 const resolved=await requestClub(slug,13)
 if(!resolved||resolved.data.version!==version)return null
 return bindThread(resolved.data)
}
const okPath=(p:unknown):p is string[]=>Array.isArray(p)&&p.length<=8&&p.every(x=>typeof x==='string'&&x.length<=80)
const okSeed=(s:unknown):s is number=>Number.isSafeInteger(s)&&(s as number)>0

export type EdgeView={kind:string;sources:SourceRef[]}
const edgeView=(e:{kind:string;sources:string[]},b:ThreadBinding):EdgeView=>({kind:e.kind,sources:e.sources.map(b.lookup).filter((s):s is SourceRef=>s!==null)})
export type ClosedView={from:PublicCard;to:PublicCard;kind:string;sources:SourceRef[]}
const closed=(edges:ClosedEdge[],b:ThreadBinding):ClosedView[]=>edges.map(e=>({from:e.from,to:e.to,...edgeView(e,b)}))

export type MoveAnswer={ok:true;edge:EdgeView}|{ok:false;reason:MoveVerdict}|null
/** One proposed stop. A legal move reveals its edge; an illegal one reveals only why (and whether it costs integrity — the client knows the table). */
export async function threadMove(slug:string,version:string,seed:number,ref:string,path:string[],candidate:string):Promise<MoveAnswer>{
 if(!okSeed(seed)||!okPath(path)||typeof candidate!=='string'||typeof ref!=='string')return null
 const b=await bound(slug,version);if(!b)return null
 const g=levelByRef(planFor(b,seed),seed,ref);if(!g)return null
 const r=tryMove(g.level,path,candidate,b.view)
 return r.ok?{ok:true,edge:edgeView(r.edge,b)}:r
}

export type CloseAnswer={ok:true;edges:ClosedView[];stops:number;optimum:number;score:number;integrity:number}|{ok:false;reason:CloseReason;integrity:number;exhausted:boolean}|null
/**
 * Close a route. Integrity is settled from the logged refused actions, each re-checked here and charged once however
 * often it was sent (TH-R07). An incomplete close is explained and costs nothing (TH-R08).
 */
export async function threadClose(slug:string,version:string,seed:number,ref:string,path:string[],attempts:Action[]):Promise<CloseAnswer>{
 if(!okSeed(seed)||!okPath(path)||!Array.isArray(attempts)||attempts.length>200||typeof ref!=='string')return null
 if(!attempts.every(a=>a&&okPath(a.path)&&typeof a.card==='string'&&a.card.length<=80))return null
 const b=await bound(slug,version);if(!b)return null
 const g=levelByRef(planFor(b,seed),seed,ref);if(!g)return null
 const s=settle(g.level,attempts,path,b.view)
 if(s.integrity<=0)return {ok:false,reason:'invalid',integrity:0,exhausted:true}
 const r=closeRoute(g.level,path,s.integrity,b.view,g.optimum)
 if(!r.ok)return {ok:false,reason:r.reason,integrity:s.integrity,exhausted:false}
 return {ok:true,edges:closed(r.edges,b),stops:r.stops,optimum:r.optimum,score:r.score,integrity:s.integrity}
}

export type FailAnswer={route:PublicCard[];edges:ClosedView[];optimum:number}|null
/** TH-R10 — only once the logged attempts really exhaust the level does the sourced valid route come out. */
export async function threadReveal(slug:string,version:string,seed:number,ref:string,attempts:Action[]):Promise<FailAnswer>{
 if(!okSeed(seed)||!Array.isArray(attempts)||attempts.length>200||typeof ref!=='string')return null
 if(!attempts.every(a=>a&&okPath(a.path)&&typeof a.card==='string'))return null
 const b=await bound(slug,version);if(!b)return null
 const g=levelByRef(planFor(b,seed),seed,ref);if(!g)return null
 if(settle(g.level,attempts,[],b.view).integrity>0)return null
 const r=failReveal(g.level,b.view)
 return r?{route:r.route,edges:closed(r.edges,b),optimum:r.optimum}:null
}
