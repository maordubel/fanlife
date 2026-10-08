/**
 * Gate 2 · the bank's own quality rules (rulebook TR-R01..R05, R09), pure and client-safe.
 *
 * A question is only as honest as the statement behind it. The shared engine deals whatever the compiled bank holds,
 * so the club gate checks the bank FIRST and drops, by name, what cannot be asked fairly:
 *
 *  · a question whose source is unchecked or missing (rule 2),
 *  · a true/false whose "false" statement equals the truth, whose "true" statement is not the truth, or whose false
 *    statement is a TRUE statement elsewhere in the bank (TR-R03),
 *  · an option set that holds an alias of the answer, or too few real distractors for four options (rule 15),
 *  · a prompt that has two correct answers (rule 15).
 *
 * It also decides what a stage may be called: `stageCapacity` counts DISTINCT facts per difficulty band and applies
 * Hall's condition, so "a nonrepeating 4+4+4 deck exists" is a proof about the bank rather than a claim (TR-R05).
 * Nothing here imports the archive and nothing invents a fact (rule 11).
 */
import type {MasterQuestion,QType} from '@/lib/game/questions/types'

/** every reason a question is kept out of the deal, by name — the admin reads these (`bankReport`) */
export type DropCode=
 |'SOURCE_UNCHECKED'|'NO_SOURCE'|'TF_SHAPE'|'TF_CLAIM_UNREADABLE'|'TF_TRUE_MISMATCH'|'TF_FALSE_EQUALS_TRUTH'|'TF_CONTEXT_COLLISION'
 |'MULTI_SHAPE'|'ORDER_SHAPE'|'MATCH_SHAPE'|'ANSWER_EMPTY'|'ALIAS_OF_ANSWER'|'OPTIONS_SHORT'|'PROMPT_CONFLICT'
export type Dropped={id:string;code:DropCode}

/** one comparison key for names: case, accents, punctuation and spacing do not make two answers different */
export const normKey=(s:string)=>String(s).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'')

/** the facts a question stands on; a question that names none stands on its natural key (minus the template), so two templates about one event still count once */
export const factsOf=(q:Pick<MasterQuestion,'factIds'|'key'>)=>q.factIds.length?q.factIds:[`k:${q.key.slice(q.key.indexOf(':')+1)}`]

const DATE=/(\d{4}-\d{2}-\d{2})/
/** "<stem> — <date>" in a date-check statement, or in its explanation */
export function claimOf(text:string):{stem:string;date:string}|null{
 const at=text.search(/\s—\s\d{4}-\d{2}-\d{2}/)
 if(at<0)return null
 const date=DATE.exec(text.slice(at))?.[1]
 return date?{stem:normKey(text.slice(0,at)),date}:null
}
export const isDateCheck=(q:Pick<MasterQuestion,'template'|'type'>)=>q.type==='tf'&&/date-check$/.test(q.template)

const answersOf=(q:MasterQuestion)=>Array.isArray(q.answer)?q.answer:[q.answer]
const distinct=(list:readonly string[])=>new Set(list.map(normKey)).size===list.length&&list.every(x=>normKey(x)!=='')

/** how many real distractors a question can field: its fixed ones and its pool, minus the answer and any alias of it */
function distractorCount(q:MasterQuestion,pools:Record<string,string[]>):{count:number;alias:boolean}{
 const answers=answersOf(q),keys=new Set(answers.map(normKey))
 const fixed=q.distractors??[],pool=q.pool&&Object.hasOwn(pools,q.pool)?pools[q.pool]!:[]
 let alias=false
 const seen=new Set<string>()
 for(const v of [...fixed,...pool]){
  const k=normKey(v)
  if(k===''||seen.has(k))continue
  if(keys.has(k)){if(!answers.includes(v))alias=true;continue}
  seen.add(k)
 }
 return {count:seen.size,alias}
}

const NEED:Record<QType,number>={mcq:3,year:3,multi:3,tf:0,order:0,match:0}

/** the first reason this question cannot be asked fairly, or null */
export function dropCodeOf(q:MasterQuestion,pools:Record<string,string[]>,trueClaims:ReadonlySet<string>):DropCode|null{
 if(!q.source||!q.source.title)return 'NO_SOURCE'
 if(!(q.source.confidence>=2))return 'SOURCE_UNCHECKED'
 const answers=answersOf(q)
 if(q.type==='tf'){
  if(q.answer!=='true'&&q.answer!=='false')return 'TF_SHAPE'
  if(isDateCheck(q)){
   const claim=claimOf(q.prompt),truth=claimOf(q.explanation)
   if(!claim||!truth||claim.stem!==truth.stem)return 'TF_CLAIM_UNREADABLE'
   if(q.answer==='true')return claim.date===truth.date?null:'TF_TRUE_MISMATCH'
   if(claim.date===truth.date)return 'TF_FALSE_EQUALS_TRUTH'
   return trueClaims.has(`${claim.stem}|${claim.date}`)?'TF_CONTEXT_COLLISION':null
  }
  return null
 }
 if(answers.length===0||answers.some(a=>typeof a!=='string'||normKey(a)===''))return 'ANSWER_EMPTY'
 if(q.type==='multi'){
  if(answers.length!==3||!distinct(answers))return 'MULTI_SHAPE'
  if((q.distractors??[]).some(d=>answers.map(normKey).includes(normKey(d))))return 'ALIAS_OF_ANSWER'
 }
 if(q.type==='order'&&(answers.length<2||!distinct(answers)))return 'ORDER_SHAPE'
 if(q.type==='match'&&(answers.length<2||!distinct(answers)||!q.left||q.left.length!==answers.length||!distinct(q.left)))return 'MATCH_SHAPE'
 if(NEED[q.type]>0){
  const {count,alias}=distractorCount(q,pools)
  if(alias)return 'ALIAS_OF_ANSWER'
  if(count<NEED[q.type])return 'OPTIONS_SHORT'
 }
 return null
}

/** the bank with every unfair question removed and named; the input is never mutated */
export function sanitizeBank(questions:readonly MasterQuestion[],pools:Record<string,string[]>):{questions:MasterQuestion[];dropped:Dropped[]}{
 const trueClaims=new Set<string>()
 for(const q of questions)if(isDateCheck(q)&&q.answer==='true'){const c=claimOf(q.prompt);if(c)trueClaims.add(`${c.stem}|${c.date}`)}
 const dropped:Dropped[]=[],kept:MasterQuestion[]=[]
 for(const q of questions){
  const code=dropCodeOf(q,pools,trueClaims)
  if(code)dropped.push({id:q.id,code});else kept.push(q)
 }
 // a prompt with two different correct answers is dropped whole (rule 15); an order/match prompt is generic by design — its items are the question
 const groups=new Map<string,MasterQuestion[]>()
 for(const q of kept){if(q.type==='order'||q.type==='match')continue;const k=`${q.type}|${normKey(q.prompt)}|${normKey(q.quoteHe??'')}`;groups.set(k,[...(groups.get(k)??[]),q])}
 const conflicted=new Set<string>()
 for(const g of groups.values()){
  if(g.length<2)continue
  const first=JSON.stringify(g[0]!.answer)
  if(g.some(x=>JSON.stringify(x.answer)!==first))for(const x of g)conflicted.add(x.id)
 }
 const out=kept.filter(q=>{if(conflicted.has(q.id)){dropped.push({id:q.id,code:'PROMPT_CONFLICT'});return false}return true})
 return {questions:out,dropped}
}

/* ------------------------------------------------------------------ stages (TR-R05) */

/** the difficulty bands of a standard (0) or hard (1) run — the engine's own `bandOf` */
export const bandOf=(difficulty:number,hard:boolean):0|1|2=>hard?(difficulty<=3?0:difficulty===4?1:2):difficulty<=2?0:difficulty===3?1:2

export type StageCapacity={ok:boolean;need:number;counts:[number,number,number];union:number}
/**
 * Can a nonrepeating `need`+`need`+`need` deck be drawn from this pool? Per band the DISTINCT facts are counted, and
 * Hall's condition is checked over all seven band subsets — a fact usable in two bands is only one fact.
 */
export function stageCapacity(pool:readonly Pick<MasterQuestion,'difficulty'|'factIds'|'key'>[],hard=false,need=4):StageCapacity{
 const bands:[Set<string>,Set<string>,Set<string>]=[new Set(),new Set(),new Set()]
 for(const q of pool)for(const f of factsOf(q))bands[bandOf(q.difficulty,hard)].add(f)
 const counts:[number,number,number]=[bands[0].size,bands[1].size,bands[2].size]
 let ok=true
 for(let mask=1;mask<8;mask++){
  const u=new Set<string>();let size=0
  for(let b=0;b<3;b++)if(mask&(1<<b)){size++;for(const f of bands[b]!)u.add(f)}
  if(u.size<need*size)ok=false
 }
 return {ok,need,counts,union:new Set([...bands[0],...bands[1],...bands[2]]).size}
}
export const distinctFacts=(pool:readonly Pick<MasterQuestion,'factIds'|'key'>[])=>new Set(pool.flatMap(factsOf)).size

/* ------------------------------------------------------------------ hints (TR-R09) */

export type HintPlan={kind:'decade';decade:number}|{kind:'context';text:string}|{kind:'strike';strike:string[]}
const yearIn=(s:string)=>{const m=/(1[89]\d\d|20\d\d)/.exec(s);return m?Number(m[1]):null}
const mix=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}

/**
 * The hint a question may give, derived ONLY from what the question itself carries: its decade, its written context,
 * or one wrong option struck out. It is refused when it would hand over the answer — a true/false has no hint at all
 * (striking "false" IS the answer), a decade that singles out one option, a context line that contains the answer,
 * a strike from a set too small to stay a choice. `null` means "no evidence resolver": the screen says so.
 */
export function resolveHint(q:MasterQuestion,options:readonly string[],seed:number):HintPlan|null{
 if(q.type==='tf')return null
 const answers=answersOf(q),keys=answers.map(normKey)
 const wrong=options.filter(o=>!keys.includes(normKey(o)))
 const kind=q.hint.kind
 if(kind==='decade'&&typeof q.decades[0]==='number'){
  const decade=q.decades[0]
  if(q.type==='mcq'||q.type==='year'){
   const inside=options.filter(o=>{const y=yearIn(o);return y!==null&&Math.floor(y/10)*10===decade})
   if(inside.length===1&&inside[0]!==undefined&&keys.includes(normKey(inside[0])))return strike()
  }
  return {kind:'decade',decade}
 }
 if(kind==='context'){
  const text=q.hint.he?.trim()||(q.type==='order'?String(answers[0]??''):q.type==='match'&&q.left?`${q.left[0]} ↔ ${answers[0]}`:'')
  const t=normKey(text)
  if(text&&!keys.some(k=>(k.length>=2&&t.includes(k))||(t.length>=3&&k.includes(t))))return {kind:'context',text}
 }
 return strike()
 function strike():HintPlan|null{
  if(wrong.length<3||q.type==='order'||q.type==='match')return null
  return {kind:'strike',strike:[wrong[mix(`${seed}:${q.id}`)%wrong.length]!]}
 }
}

/* ------------------------------------------------------------------ the bank report (TR-R04) */

export type BankReport={
 questions:number;distinctFacts:number;reuseRate:number
 byTopic:Record<string,number>;byType:Record<string,number>;byDecade:Record<string,number>;byDifficulty:Record<string,number>;byTemplate:Record<string,number>
 dropped:Record<string,number>;factless:number;dateOnly:boolean
}
/** the dashboard the rulebook asks for: distinct facts, distributions, reuse rate, and what was dropped and why */
export function bankReport(questions:readonly MasterQuestion[],dropped:readonly Dropped[]=[]):BankReport{
 const tally=<T,>(rows:readonly T[],by:(x:T)=>string[])=>{const m:Record<string,number>={};for(const r of rows)for(const k of by(r))m[k]=(m[k]??0)+1;return m}
 const facts=distinctFacts(questions)
 return {
  questions:questions.length,distinctFacts:facts,reuseRate:facts?Math.round(questions.length/facts*100)/100:0,
  byTopic:tally(questions,q=>[q.topic]),byType:tally(questions,q=>[q.type]),byDecade:tally(questions,q=>q.decades.length?q.decades.map(String):['undated']),
  byDifficulty:tally(questions,q=>[String(q.difficulty)]),byTemplate:tally(questions,q=>[q.template]),
  dropped:tally(dropped,d=>[d.code]),factless:questions.filter(q=>q.factIds.length===0).length,
  dateOnly:questions.length>0&&questions.every(isDateCheck)
 }
}
