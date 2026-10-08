import {colourHex,luminanceOf,type ClothSpec,type ColourKey} from './kit-model'

/**
 * Gate 5 · the studio's briefs and design heuristics (rulebook §7, KS-R03..R07). Pure and client-safe.
 *
 * The Worker's studio hard-coded Hapoel, red, 1923 and "memory2010". Here everything that was a club fact is a parameter:
 * the club's approved primary and secondary colours, whether an approved rivalry exists, and which archive shirts the
 * supporter has actually OPENED. A metric that needs something missing is N/A and the rest is renormalised — a club with
 * no historical shirts gets no zero-quality penalty (KS-R06). None of this is a verdict on beauty: the scorecard says so.
 */
export type StudioIdentity={primary:ColourKey|null;secondary:ColourKey|null;/** an owner-approved rivalry exists, so a derby brief can be offered */derby:boolean;/** the short upper-case name the back may carry, when it fits */wordmark:string|null}
export type Reference={id:string;season:string;cloth:ClothSpec}
export type BriefCtx={identity:StudioIdentity;memory:Reference|null}
export type BriefId='free'|'derby'|'european'|'supporters'|'memory'
type Check=(s:ClothSpec,c:BriefCtx)=>boolean
export type Brief={id:BriefId;/** whether this club can be given this brief at all */offered:(c:BriefCtx)=>boolean;checks:Check[]}

const own=(s:ClothSpec,c:BriefCtx,k:ColourKey|null)=>!!k&&(k===c.identity.primary||k===c.identity.secondary)
const changed=(s:ClothSpec,r:ClothSpec)=>s.collar!==r.collar||s.collarInk!==r.collarInk||s.sleeveInk!==r.sleeveInk||s.crest!==r.crest||s.name!==r.name||s.number!==r.number||s.maker!==r.maker||s.sponsor!==r.sponsor

export const BRIEFS:readonly Brief[]=[
 {id:'free',offered:()=>true,checks:[s=>!!s.base]},
 {id:'derby',offered:c=>c.identity.derby&&!!c.identity.primary,checks:[(s,c)=>s.base===c.identity.primary,(s,c)=>!!s.trim&&own(s,c,s.trim),s=>s.crest]},
 {id:'european',offered:c=>!!c.identity.primary&&!!c.identity.secondary,checks:[(s,c)=>s.base===c.identity.primary,s=>s.collarInk==='trim'||s.sleeveInk==='trim',s=>s.crest]},
 {id:'supporters',offered:()=>true,checks:[s=>!!s.name,s=>s.number===12]},
 {id:'memory',offered:c=>!!c.memory?.cloth,checks:[(s,c)=>!!c.memory&&s.base===c.memory.cloth.base,(s,c)=>!!c.memory&&s.pattern===c.memory.cloth.pattern,(s,c)=>!!c.memory&&s.trim===c.memory.cloth.trim,(s,c)=>!!c.memory&&changed(s,c.memory.cloth)]},
]
export const briefsOffered=(c:BriefCtx)=>BRIEFS.filter(b=>b.offered(c))
export const briefFit=(b:Brief,s:ClothSpec,c:BriefCtx)=>Math.round(100*b.checks.filter(f=>f(s,c)).length/b.checks.length)
export const briefMet=(b:Brief,s:ClothSpec,c:BriefCtx)=>b.checks.every(f=>f(s,c))

// ------------------------------------------------------------------ the five heuristics
export type MetricId='identity'|'brief'|'originality'|'coherence'|'dna'
/** the native studio's overall weights, kept as they were (KS-R05) */
export const METRIC_WEIGHT:Readonly<Record<MetricId,number>>={identity:27,brief:28,originality:18,coherence:22,dna:5}
export const METRICS:readonly MetricId[]=['identity','brief','originality','coherence','dna']
export type Metric={id:MetricId;/** null = N/A: it needs something this design or this club does not have */value:number|null}
export type Scorecard={metrics:Metric[];/** renormalised over the metrics that exist, or null when nothing can be measured */overall:number|null;/** how many opened club shirts the originality and DNA readings compared against */compared:number}

/** how many attributes two designs share, out of the six that make a look */
const LOOK:(keyof ClothSpec)[]=['base','trim','pattern','collar','collarInk','sleeveInk']
const shared=(a:ClothSpec,b:ClothSpec)=>LOOK.filter(k=>a[k]===b[k]).length

export function coherence(s:ClothSpec):number{
 if(!s.base)return 0
 let n=100
 if(s.pattern!=='solid'&&!s.trim)n-=40
 if(s.trim&&s.pattern!=='solid'){const a=luminanceOf(colourHex(s.base)),b=luminanceOf(colourHex(s.trim));if(Math.abs(a-b)<0.12)n-=30}
 if((s.collarInk==='trim'||s.sleeveInk==='trim')&&!s.trim)n-=20
 if(s.sponsor&&s.pattern!=='solid'&&s.pattern!=='hoop-tonal'&&s.pattern!=='pinstripe')n-=10
 if((s.name!==null)!==(s.number!==null))n-=10
 return Math.max(0,n)
}
export function identityScore(s:ClothSpec,c:BriefCtx):number|null{
 const {primary,secondary}=c.identity
 if(!primary)return null
 let n=0
 n+=s.base===primary?50:s.base&&s.base===secondary?35:0
 n+=s.trim?(own(s,c,s.trim)?30:0):s.base===primary?15:0
 n+=s.crest?20:0
 return n
}

export function scorecard(s:ClothSpec,brief:Brief|null,refs:Reference[],c:BriefCtx):Scorecard{
 const drawn=refs.filter(r=>r.cloth)
 const near=drawn.length?Math.max(...drawn.map(r=>shared(s,r.cloth))):null
 const metrics:Metric[]=[
  {id:'identity',value:s.base?identityScore(s,c):null},
  {id:'brief',value:brief&&s.base?briefFit(brief,s,c):null},
  {id:'originality',value:near===null||!s.base?null:Math.round(100*(LOOK.length-near)/LOOK.length)},
  {id:'coherence',value:s.base?coherence(s):null},
  {id:'dna',value:near===null||!s.base?null:Math.round(100*near/LOOK.length)},
 ]
 const live=metrics.filter(m=>m.value!==null),w=live.reduce((n,m)=>n+METRIC_WEIGHT[m.id],0)
 return {metrics,overall:w?Math.round(live.reduce((n,m)=>n+m.value!*METRIC_WEIGHT[m.id],0)/w):null,compared:drawn.length}
}
