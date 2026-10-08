import type {ClubData} from './contract'
import {kitViews,type KitView} from './gate-content'
import {forbiddenColor} from './theme'
import {documentedCloth,variantOf,type ClothSpec,type Variant} from './kit-model'
import {HINT_LIMIT,HINT_PENALTY,KIT_ROUND,MIN_SHIRTS,OPTION_RAMP,PERFECT_BONUS,SHIRT_POINTS,STEP_ORDER,STEP_WEIGHT,type Option,type PublicPuzzle,type Step,type StepVerdict,type Verdict} from './kit-rules'
export * from './kit-rules'
import {cycleSeed,takeFrom} from '@/lib/rotation/deck'

/**
 * Gate 4 · Build the Kit — the deal, the hints and the grade, for ANY club (Wave kits, 8.10.2026).
 *
 * The Worker's run is five steps over an eight-layer shirt. A FAN LIFE club documents colours, a design name, a maker and
 * sometimes a sponsor — so the steps are the ones the club's own archive can ask (`activeSteps`), never padded with a
 * layer nobody documented. A step's option is a REAL value another kit of the club wore, so a wrong card is always
 * something the club actually put on a shirt; the right one is never flagged — it is recomputed from the seed when the
 * server grades, and the answer sheet never leaves this module (`gradePuzzle` runs in a server action).
 *
 * Pure. Client code imports the TYPES and constants only.
 */
export type Eligible={kit:KitView;cloth:ClothSpec;variant:Variant}

/** the club's kits that can be drawn from their documented fields alone, under the club's own colour policy (rule 95) */
export function eligibleKits(data:ClubData):Eligible[]{
 const forbidden=(hex:string)=>forbiddenColor(data.theme,hex)
 return kitViews(data).flatMap(kit=>{const cloth=documentedCloth(kit,forbidden);return cloth?[{kit,cloth,variant:variantOf(kit.type)}]:[]}).sort((a,b)=>a.kit.id.localeCompare(b.kit.id))
}

const hash=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(36)}
function rng(seed:number){let a=seed>>>0;return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
function shuffled<T>(xs:readonly T[],seed:number):T[]{const r=rng(seed),a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j]!,a[i]!]}return a}

const keyOf=(step:Step,c:ClothSpec)=>step==='colours'?`${c.base}|${c.trim??''}`:step==='design'?c.pattern:((step==='maker'?c.maker:c.sponsor)??'').toLowerCase()
const hasStep=(step:Step,c:ClothSpec)=>step==='colours'||step==='design'||!!(step==='maker'?c.maker:c.sponsor)
type Pool=Map<string,{patch:Partial<ClothSpec>;seen:number;variants:Set<Variant>}>
function poolOf(list:Eligible[],step:Step):Pool{
 const pool:Pool=new Map(),spell=new Map<string,Map<string,number>>()
 for(const e of list){
  if(!hasStep(step,e.cloth))continue
  const k=keyOf(step,e.cloth),row=pool.get(k)??{patch:{},seen:0,variants:new Set<Variant>()}
  row.seen++;row.variants.add(e.variant);pool.set(k,row)
  if(step==='maker'||step==='sponsor'){const raw=(step==='maker'?e.cloth.maker:e.cloth.sponsor)!,s=spell.get(k)??new Map();s.set(raw,(s.get(raw)??0)+1);spell.set(k,s)}
 }
 for(const [k,row] of pool){
  const c=list.find(e=>hasStep(step,e.cloth)&&keyOf(step,e.cloth)===k)!.cloth
  row.patch=step==='colours'?{base:c.base,trim:c.trim}:step==='design'?{pattern:c.pattern}:step==='maker'?{maker:best(spell.get(k)!)}:{sponsor:best(spell.get(k)!)}
 }
 return pool
}
const best=(m:Map<string,number>)=>[...m.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]![0]

/** the steps this club's archive can honestly ask: a field with at least two different documented values */
export function activeSteps(list:Eligible[]):Step[]{return STEP_ORDER.filter(s=>poolOf(list,s).size>=2)}
/** a run needs enough drawable kits and at least two askable steps — otherwise it is a quiz, not an assembly */
export const canRun=(list:Eligible[])=>list.length>=MIN_SHIRTS&&activeSteps(list).length>=2

/** the shuffled deck for a lap, and the kits a round of `count` takes from the cursor */
export function dealKits(list:Eligible[],seed:number,cursor:number,count=KIT_ROUND):Eligible[]{
 if(list.length<MIN_SHIRTS)return []
 const safe=Number.isFinite(cursor)&&cursor>0?Math.floor(cursor):0,cycle=Math.floor(safe/list.length)
 return takeFrom(shuffled(list,cycleSeed(seed,cycle)),safe%list.length,Math.min(count,list.length))
}

function optionsFor(e:Eligible,step:Step,index:number,seed:number,pools:Map<Step,Pool>):{options:Option[];correctId:string}{
 const pool=pools.get(step)!,correctKey=keyOf(step,e.cloth),id=(k:string)=>hash(`${step}|${k}`)
 const want=Math.min(OPTION_RAMP[Math.min(index,OPTION_RAMP.length-1)]!,pool.size)
 // plausible first: a value that kit-type has worn; a value from the other variants only tops up
 const others=[...pool.keys()].filter(k=>k!==correctKey).sort()
 const same=others.filter(k=>pool.get(k)!.variants.has(e.variant)),rest=others.filter(k=>!same.includes(k))
 const salt=Number.parseInt(hash(`${e.kit.id}|${step}`),36)
 const chosen=[...shuffled(same,seed^salt),...shuffled(rest,(seed^salt)+1)].slice(0,want-1)
 const keys=shuffled([correctKey,...chosen],(seed^salt)+2)
 return {correctId:id(correctKey),options:keys.map(k=>({id:id(k),step,patch:pool.get(k)!.patch,seen:pool.get(k)!.seen}))}
}

export type Dealt={eligible:Eligible;puzzle:PublicPuzzle;correct:Record<string,string>}
/** the round the seed and cursor name: public puzzles for the client, and (server-side only) the ids that are right */
export function dealKitRun(list:Eligible[],seed:number,cursor:number,count=KIT_ROUND):Dealt[]{
 if(!canRun(list))return []
 const steps=activeSteps(list),pools=new Map(steps.map(s=>[s,poolOf(list,s)] as const))
 return dealKits(list,seed,cursor,count).map((e,index)=>{
  const correct:Record<string,string>={}
  const rows=steps.filter(s=>hasStep(s,e.cloth)).map(step=>{const o=optionsFor(e,step,index,seed,pools);correct[step]=o.correctId;return {step,options:o.options}})
  return {eligible:e,correct,puzzle:{id:`k${hash(`${seed}|${cursor}|${index}|${e.kit.id}`)}`,index,seasonLabel:e.kit.season,variant:e.variant,steps:rows}}
 })
}
/** strip the answer sheet: what the browser may hold */
export const publicRun=(run:Dealt[]):PublicPuzzle[]=>run.map(d=>d.puzzle)

/** whole-number weights summing to 100 across the steps a shirt actually asks (largest remainder) */
export function weightsOf(steps:Step[]):Record<Step,number>{
 const total=steps.reduce((n,s)=>n+STEP_WEIGHT[s],0)||1,raw=steps.map(s=>({s,v:STEP_WEIGHT[s]*SHIRT_POINTS/total}))
 const out:Record<string,number>={};let left=SHIRT_POINTS
 for(const r of raw){out[r.s]=Math.floor(r.v);left-=out[r.s]!}
 for(const r of [...raw].sort((a,b)=>(b.v%1)-(a.v%1)||STEP_ORDER.indexOf(a.s)-STEP_ORDER.indexOf(b.s))){if(left<=0)break;out[r.s]!++;left--}
 return out as Record<Step,number>
}

export function gradePuzzle(run:Dealt[],index:number,picks:Record<string,unknown>,hints:number):Verdict|null{
 const d=run[index]
 if(!d||!Number.isInteger(index))return null
 const h=Number.isInteger(hints)?Math.min(HINT_LIMIT,Math.max(0,hints)):0
 const steps=d.puzzle.steps.map(s=>s.step),w=weightsOf(steps)
 const rows:StepVerdict[]=d.puzzle.steps.map(({step,options})=>{
  const pick=typeof picks[step]==='string'?picks[step] as string:null,chosen=options.find(o=>o.id===pick)??null,truth=options.find(o=>o.id===d.correct[step])!
  const ok=!!chosen&&chosen.id===truth.id
  return {step,ok,points:ok?w[step]:0,max:w[step],chosen,truth}
 })
 const right=rows.filter(r=>r.ok).length,perfect=right===rows.length,base=rows.reduce((n,r)=>n+r.points,0)
 const score=Math.max(0,base-h*HINT_PENALTY)+(perfect?PERFECT_BONUS:0)
 return {index,seasonLabel:d.puzzle.seasonLabel,variant:d.puzzle.variant,steps:rows,right,perfect,base,hints:h,score,answer:d.eligible.cloth,kitId:d.eligible.kit.id,sources:d.eligible.kit.sources}
}
/** The next wrong card to strike on a step, given how many were already struck THERE (`nth`) — deterministic, and always leaves the right card and one other standing. */
export function strikeFor(run:Dealt[],index:number,step:Step,nth:number):string|null{
 const d=run[index],row=d?.puzzle.steps.find(s=>s.step===step)
 if(!d||!row||!Number.isInteger(nth)||nth<0||nth>=HINT_LIMIT)return null
 const wrong=row.options.filter(o=>o.id!==d.correct[step]).sort((a,b)=>hash(`${d.puzzle.id}|${a.id}`).localeCompare(hash(`${d.puzzle.id}|${b.id}`)))
 return nth<wrong.length-1?wrong[nth]!.id:null
}
