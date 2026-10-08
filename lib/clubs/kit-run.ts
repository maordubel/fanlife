import type {ClubData} from './contract'
import {kitViews,type KitView} from './gate-content'
import {forbiddenColor} from './theme'
import {documentedCloth,variantOf,type ClothSpec,type Variant} from './kit-model'
import {FIELDS,FIELD_WEIGHT,HINT_LIMIT,HINT_PENALTY,KIT_ROUND,MIN_SHIRTS,OPTION_RAMP,PERFECT_BONUS,SHIRT_POINTS,STEP_FIELDS,STEP_ORDER,unlocksDna,type Field,type FieldVerdict,type KitGame,type Option,type PublicPuzzle,type Step,type StepVerdict,type Verdict} from './kit-rules'
export * from './kit-rules'
import {cycleSeed,takeFrom} from '@/lib/rotation/deck'

/**
 * Gate 4 · Build the Kit — the deal, the hints and the grade, for ANY club (Wave kits, 8.10.2026; rulebook §6).
 *
 * The Worker's shirt is built in five steps and scored on ten fields that add up to 100. A FAN LIFE club documents the two
 * body colours, a design name, a maker and sometimes a sponsor — never a collar, sleeves or crest. So a shirt is scored on
 * the fields ITS row documents, renormalised to 100 (largest remainder); a part the archive does not state is not asked and
 * not scored (rule 11 — an unknown sponsor is never a "verified blank"). The full five-part assembly is offered only for a
 * kit that documents all ten fields, which no club pack does yet, so today the reduced-parts run is the game and the
 * season/maker/design board is the explicitly named recognition mode.
 *
 * A step's option is a REAL value another kit of the club wore. Option ids are salted per puzzle, so they carry neither the
 * season nor which one is right; the right one is recomputed from the seed when the server grades, and the answer sheet
 * never leaves this module (`gradePuzzle` runs in a server action). Pure. Client code imports the TYPES and constants only.
 */
export type Eligible={kit:KitView;cloth:ClothSpec;variant:Variant}

/** the club's kits that can be drawn from their documented fields alone, under the club's own colour policy (rule 95) */
export function eligibleKits(data:ClubData):Eligible[]{
 const forbidden=(hex:string)=>forbiddenColor(data.theme,hex)
 return kitViews(data).flatMap(kit=>{const cloth=documentedCloth(kit,forbidden);return cloth?[{kit,cloth,variant:variantOf(kit.type)}]:[]}).sort((a,b)=>a.kit.id.localeCompare(b.kit.id))
}

/** the fields this kit's archive row actually states. Collar, sleeves and crest are not stated by any club pack today. */
export function documentedFields(e:Eligible):Field[]{
 const out:Field[]=['base','secondary','pattern']
 if(e.cloth.maker)out.push('maker')
 if(e.cloth.sponsor)out.push('sponsor')
 return FIELDS.filter(f=>out.includes(f))
}
/** the five-part assembly asks for a kit that documents every one of the ten fields */
export const documentsEverything=(e:Eligible)=>documentedFields(e).length===FIELDS.length

const hash=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(36)}
function rng(seed:number){let a=seed>>>0;return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
function shuffled<T>(xs:readonly T[],seed:number):T[]{const r=rng(seed),a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j]!,a[i]!]}return a}

/** which kits a game deals from: the assembly only the fully documented, the practice every drawable kit */
export const poolFor=(list:Eligible[],game:Exclude<KitGame,'recognition'>)=>game==='assembly'?list.filter(documentsEverything):list

const keyOf=(step:Step,c:ClothSpec)=>step==='body'?`${c.base}|${c.trim??''}`:step==='construction'?c.pattern:step==='maker'?(c.maker??'').toLowerCase():step==='sponsor'?(c.sponsor??'').toLowerCase():''
/** a step is asked of a kit only when the kit's row states it ('crest' is stated by no club pack yet) */
const hasStep=(step:Step,c:ClothSpec)=>step==='body'||step==='construction'||(step==='maker'&&!!c.maker)||(step==='sponsor'&&!!c.sponsor)
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
  row.patch=step==='body'?{base:c.base,trim:c.trim}:step==='construction'?{pattern:c.pattern}:step==='maker'?{maker:best(spell.get(k)!)}:{sponsor:best(spell.get(k)!)}
 }
 return pool
}
const best=(m:Map<string,number>)=>[...m.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]![0]

/** the steps this club's archive can honestly ask: a step with at least two different documented values */
export function activeSteps(list:Eligible[]):Step[]{return STEP_ORDER.filter(s=>poolOf(list,s).size>=2)}
/** a run needs enough kits and at least two askable steps — otherwise it is a quiz, not an assembly */
export const canRun=(list:Eligible[],game:Exclude<KitGame,'recognition'>='practice')=>{const p=poolFor(list,game);return p.length>=MIN_SHIRTS&&activeSteps(p).length>=2}
/** the run games the club can play now, best first (recognition is decided by the view, from the buildable kits) */
export const runGames=(list:Eligible[]):Exclude<KitGame,'recognition'>[]=>(['assembly','practice'] as const).filter(g=>canRun(list,g))

/** the shuffled deck for a lap, and the kits a round of `count` takes from the cursor */
export function dealKits(list:Eligible[],seed:number,cursor:number,count=KIT_ROUND):Eligible[]{
 if(list.length<MIN_SHIRTS)return []
 const safe=Number.isFinite(cursor)&&cursor>0?Math.floor(cursor):0,cycle=Math.floor(safe/list.length)
 return takeFrom(shuffled(list,cycleSeed(seed,cycle)),safe%list.length,Math.min(count,list.length))
}

function optionsFor(e:Eligible,step:Step,index:number,seed:number,pools:Map<Step,Pool>,puzzleId:string):{options:Option[];correctId:string}{
 const pool=pools.get(step)!,correctKey=keyOf(step,e.cloth),id=(k:string)=>hash(`${puzzleId}|${step}|${k}`)
 const want=Math.min(OPTION_RAMP[Math.min(index,OPTION_RAMP.length-1)]!,pool.size)
 // plausible first: a value that kit-type has worn; a value from the other variants only tops up
 const others=[...pool.keys()].filter(k=>k!==correctKey).sort()
 const same=others.filter(k=>pool.get(k)!.variants.has(e.variant)),rest=others.filter(k=>!same.includes(k))
 const salt=Number.parseInt(hash(`${e.kit.id}|${step}`),36)
 const chosen=[...shuffled(same,seed^salt),...shuffled(rest,(seed^salt)+1)].slice(0,want-1)
 const keys=shuffled([correctKey,...chosen],(seed^salt)+2)
 return {correctId:id(correctKey),options:keys.map(k=>({id:id(k),step,patch:pool.get(k)!.patch,seen:pool.get(k)!.seen}))}
}

export type Dealt={eligible:Eligible;puzzle:PublicPuzzle;correct:Record<string,string>;/** the fields this shirt is scored on, in field order */scored:Field[]}
/** the round the seed and cursor name: public puzzles for the client, and (server-side only) the ids that are right */
export function dealKitRun(list:Eligible[],seed:number,cursor:number,count=KIT_ROUND,game:Exclude<KitGame,'recognition'>='practice'):Dealt[]{
 if(!canRun(list,game))return []
 const from=poolFor(list,game),steps=activeSteps(from),pools=new Map(steps.map(s=>[s,poolOf(from,s)] as const))
 return dealKits(from,seed,cursor,count).map((e,index)=>{
  const puzzleId=`k${hash(`${seed}|${cursor}|${index}|${e.kit.id}|${game}`)}`,correct:Record<string,string>={}
  const rows=steps.filter(s=>hasStep(s,e.cloth)).map(step=>{const o=optionsFor(e,step,index,seed,pools,puzzleId);correct[step]=o.correctId;return {step,options:o.options}})
  const asked=rows.map(r=>r.step),doc=documentedFields(e),scored=FIELDS.filter(f=>doc.includes(f)&&asked.some(s=>STEP_FIELDS[s].includes(f)))
  return {eligible:e,correct,scored,puzzle:{id:puzzleId,index,seasonLabel:e.kit.season,variant:e.variant,steps:rows}}
 })
}
/** strip the answer sheet: what the browser may hold */
export const publicRun=(run:Dealt[]):PublicPuzzle[]=>run.map(d=>d.puzzle)

/** whole-number weights summing to 100 across the fields a shirt actually scores (largest remainder, KB-R03) */
export function weightsOf(fields:readonly Field[]):Record<Field,number>{
 const total=fields.reduce((n,f)=>n+FIELD_WEIGHT[f],0)||1,raw=fields.map(f=>({f,v:FIELD_WEIGHT[f]*SHIRT_POINTS/total}))
 const out:Record<string,number>={};let left=SHIRT_POINTS
 for(const r of raw){out[r.f]=Math.floor(r.v);left-=out[r.f]!}
 for(const r of [...raw].sort((a,b)=>(b.v%1)-(a.v%1)||FIELDS.indexOf(a.f)-FIELDS.indexOf(b.f))){if(left<=0)break;out[r.f]!++;left--}
 return out as Record<Field,number>
}

const same=(f:Field,a:Option|null,b:Option)=>{
 if(!a)return false
 switch(f){
  case 'base':return a.patch.base===b.patch.base
  case 'secondary':return (a.patch.trim??null)===(b.patch.trim??null)
  case 'pattern':return a.patch.pattern===b.patch.pattern
  case 'maker':return (a.patch.maker??'').toLowerCase()===(b.patch.maker??'').toLowerCase()
  case 'sponsor':return (a.patch.sponsor??'').toLowerCase()===(b.patch.sponsor??'').toLowerCase()
  default:return false
 }
}

/** Grade one shirt. `hints` = how many DISTINCT, verified hint receipts the player spent on it (the action counts them). */
export function gradePuzzle(run:Dealt[],index:number,picks:Record<string,unknown>,hints:number):Verdict|null{
 const d=run[index]
 if(!d||!Number.isInteger(index))return null
 const h=Number.isInteger(hints)?Math.min(HINT_LIMIT,Math.max(0,hints)):0
 const w=weightsOf(d.scored)
 const chosenOf=(step:Step)=>{const row=d.puzzle.steps.find(s=>s.step===step)!,pick=typeof picks[step]==='string'?picks[step] as string:null;return {chosen:row.options.find(o=>o.id===pick)??null,truth:row.options.find(o=>o.id===d.correct[step])!}}
 const fields:FieldVerdict[]=[],steps:StepVerdict[]=d.puzzle.steps.map(({step})=>{
  const {chosen,truth}=chosenOf(step),mine=STEP_FIELDS[step].filter(f=>d.scored.includes(f))
  const fv=mine.map(f=>({field:f,ok:same(f,chosen,truth),points:0,max:w[f]}))
  for(const x of fv){x.points=x.ok?x.max:0;fields.push(x)}
  return {step,ok:fv.every(x=>x.ok),points:fv.reduce((n,x)=>n+x.points,0),max:fv.reduce((n,x)=>n+x.max,0),chosen,truth}
 })
 const fieldPoints=fields.reduce((n,f)=>n+f.points,0),perfect=fields.length>0&&fields.every(f=>f.ok)
 const score=Math.max(0,fieldPoints-h*HINT_PENALTY)+(perfect?PERFECT_BONUS:0)
 return {index,seasonLabel:d.puzzle.seasonLabel,variant:d.puzzle.variant,steps,fields,right:steps.filter(s=>s.ok).length,perfect,fieldPoints,scored:fields.length,unknown:FIELDS.filter(f=>!d.scored.includes(f)),hints:h,score,dna:unlocksDna(fieldPoints),answer:d.eligible.cloth,kitId:d.eligible.kit.id,sources:d.eligible.kit.sources}
}
/** The wrong card a hint strikes on a step, given how many were already struck THERE (`nth`) — deterministic, and always leaves the right card and one other standing. */
export function strikeFor(run:Dealt[],index:number,step:Step,nth:number):string|null{
 const d=run[index],row=d?.puzzle.steps.find(s=>s.step===step)
 if(!d||!row||!Number.isInteger(nth)||nth<0||nth>=HINT_LIMIT)return null
 const wrong=row.options.filter(o=>o.id!==d.correct[step]).sort((a,b)=>hash(`${d.puzzle.id}|${a.id}`).localeCompare(hash(`${d.puzzle.id}|${b.id}`)))
 return nth<wrong.length-1?wrong[nth]!.id:null
}
