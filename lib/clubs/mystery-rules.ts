/**
 * Gate 10 · the clue logic (universal rulebook §12, BC-R01..R14). Pure — no server, no React, no cookies.
 *
 * A mystery is a TARGET plus an ORDERED list of clues. Whether it may be played, and in which mode, is decided here and
 * nowhere else:
 *
 *  · practice     — five or more sourced clues, no widening, no leak. One candidate left = a graded puzzle; two or three, or
 *                   no candidate ladder at all = an EXPLORATION (labelled, the archive's intended player is still the key).
 *  · competitive  — daily and duel. Exactly ten distinct sourced clues, three evidence families, typed facts, a per-prefix
 *                   candidate count that never rises, falls on every clue until one candidate is left, ends on exactly one.
 *                   Four prose clues can never open it: they carry no ladder, so uniqueness is unproven (BLIND_COW_NOT_UNIQUE).
 *
 * "Unique" always means unique inside the declared archive domain (BC-R05) — the Worker bank counts unresolved scorer names
 * as possible other answers ("phantoms"), so a clue is not decisive while an unidentified man also fits. This module only
 * reads the counts the bank produced; it never invents one.
 */
import {fold} from '@/lib/game/roster-search'
import {SCORING} from '@/lib/game/blind-cow/scoring'

export const PRACTICE_MIN_CLUES=5
export const PRACTICE_MAX_CANDIDATES=3
export const COMPETITIVE_CLUES=10
export const COMPETITIVE_FAMILIES=3
/** The only scoring version this code can honour. A run sealed under any other is refused, never re-scored. */
export const SUPPORTED_SCORING=1

export type BlockerCode='BLIND_COW_NOT_UNIQUE'|'AMBIGUOUS_IDENTITY'|'SOURCE_UNCHECKED'|'RUNTIME_UNAVAILABLE'|'VERSION_UNSUPPORTED'
export type Blocker={code:BlockerCode;detail:string;/** 1-based clue number, when one clue is at fault */clue?:number}

export type Scope={season?:string;competition?:string}
export type RuleClue={id:string;label:string;value:string;sources:string[];type?:string;family?:string;facet?:string;factKey?:string;scope?:Scope;/** alt text / filename of any picture the clue carries */media?:string[]}
export type RuleMystery={id:string;clues:RuleClue[];/** candidates left after clue i (index 0 = after clue 1); absent = never computed */remaining?:number[]}
export type RuleTarget={id:string;name:string;aliases:string[]}

// ------------------------------------------------------------------ BC-R08 · the name must not leak
/** Every token that would give him away: the folded full name, each part of 3+ letters, every alias the same way. */
export function nameTokens(t:RuleTarget):string[]{
 const out=new Set<string>()
 for(const raw of [t.name,...t.aliases]){
  const n=fold(raw).toLowerCase();if(!n)continue
  out.add(n)
  for(const part of n.split(' '))if(part.length>=3)out.add(part)
  // a Latin spelling also leaks through its ASCII-folded form
  const ascii=n.normalize('NFD').replace(/[̀-ͯ]/g,'');if(ascii!==n){out.add(ascii);for(const p of ascii.split(' '))if(p.length>=3)out.add(p)}
 }
 return [...out]
}
/** Does `text` contain one of the tokens as a whole word (or, for a multi-word token, as a phrase)? */
export function leaks(text:string,tokens:string[]):string|null{
 const hay=fold(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''),words=new Set(hay.split(/[^\p{L}\p{N}]+/u).filter(Boolean))
 for(const t of tokens){const needle=t.normalize('NFD').replace(/[̀-ͯ]/g,'');if(needle.includes(' ')?hay.includes(needle):words.has(needle))return t}
 return null
}
/** A clue's whole public payload: label, value, any picture text. The id and the sources stay on the server (the view sends only n/label/value); a source title that names him belongs in the reveal. */
export const publicText=(c:RuleClue)=>[c.label,c.value,...(c.media??[])].join(' ')

// ------------------------------------------------------------------ BC-R03 · scope
const CAREER_TOTAL=/סה"כ|בסך הכול|בסך הכל|שערים בהפועל|career total|in total|overall|all[- ]time|\b\d+\s+(?:goals|appearances)\s+(?:for|in)\s+(?:the club|his career)/i
const SEASON=/\d{4}\/\d{2}|\d{4}-\d{2}|\b(?:19|20)\d{2}\b/
/** What is wrong with the scope of one clue, or null. A shirt number needs its season; a total needs a scoped, complete source. */
export function scopeProblem(c:RuleClue):string|null{
 if(CAREER_TOTAL.test(c.value))return 'a career total (no scoped, complete source can back it)'
 if(c.type==='shirt_number'||c.facet==='shirt'){if(!(c.scope?.season||SEASON.test(c.value)))return 'a shirt number without its season'}
 if(/europe|euro\b|אירופ/i.test(c.value)&&!c.scope?.competition&&!c.factKey&&!/(?:גביע|ליגת|ליגה|cup|league|uefa|champions)/i.test(c.value))return 'a European claim without its competition'
 return null
}

// ------------------------------------------------------------------ the narrowing ladder (BC-R04)
export type Rung={n:number;clueId:string;family:string|null;facet:string|null;type:string|null;remaining:number|null;/** how many candidates this clue removed, null when unknown */removed:number|null;note:'ok'|'redundant'|'widens'|'same-facet'|'unknown'|'settled'}
export function ladder(m:RuleMystery):Rung[]{
 let prev:number|null=null,lastFacet:string|null=null
 return m.clues.map((c,i)=>{
  const r=m.remaining&&Number.isFinite(m.remaining[i])?m.remaining[i]!:null,facet=c.facet??null
  let note:Rung['note']=r===null?'unknown':'ok'
  if(r!==null&&prev!==null){if(r>prev)note='widens';else if(r===prev)note=prev===1?'settled':'redundant'}
  if(note==='ok'&&facet&&facet===lastFacet)note='same-facet'
  else if(facet&&facet===lastFacet&&note==='redundant')note='redundant'
  const row:Rung={n:i+1,clueId:c.id,family:c.family??null,facet,type:c.type??null,remaining:r,removed:r!==null&&prev!==null?prev-r:null,note}
  if(r!==null)prev=r;lastFacet=facet
  return row
 })
}

// ------------------------------------------------------------------ verdicts
export type PracticeKind='unique'|'exploration'
export type Verdict={ok:boolean;blockers:Blocker[]}
export type Evaluation={
 id:string
 clues:number
 families:string[]
 /** the candidates left after the last clue, or null when no ladder was ever computed */
 finalCandidates:number|null
 practice:Verdict&{kind:PracticeKind|null}
 competitive:Verdict
 ladder:Rung[]
}
const add=(b:Blocker[],code:BlockerCode,detail:string,clue?:number)=>{b.push(clue?{code,detail,clue}:{code,detail})}

/** Problems that make a mystery unfit for EVERY mode: a leak, a missing source, a scope error, a widening ladder. */
function commonProblems(m:RuleMystery,target:RuleTarget):Blocker[]{
 const b:Blocker[]=[],tokens=nameTokens(target),seen=new Set<string>()
 m.clues.forEach((c,i)=>{
  const n=i+1,hit=leaks(publicText(c),tokens)
  if(hit)add(b,'AMBIGUOUS_IDENTITY',`clue ${n} names the target ("${hit}")`,n)
  if(!c.sources.length)add(b,'SOURCE_UNCHECKED',`clue ${n} has no source`,n)
  const sp=scopeProblem(c);if(sp)add(b,'BLIND_COW_NOT_UNIQUE',`clue ${n} is ${sp}`,n)
  if(seen.has(c.id))add(b,'BLIND_COW_NOT_UNIQUE',`clue ${n} repeats an earlier clue`,n)
  seen.add(c.id)
 })
 for(const r of ladder(m)){
  if(r.note==='widens')add(b,'BLIND_COW_NOT_UNIQUE',`clue ${r.n} widens the field`,r.n)
  if(r.note==='same-facet')add(b,'BLIND_COW_NOT_UNIQUE',`clues ${r.n-1} and ${r.n} share the facet ${r.facet}`,r.n)
 }
 return b
}

export type Services={/** the sealed-state authority + scoring version are available */runtime:boolean;scoringVersion?:number}

export function evaluate(m:RuleMystery,target:RuleTarget,services:Services={runtime:true,scoringVersion:SUPPORTED_SCORING}):Evaluation{
 const rungs=ladder(m),last=m.remaining&&m.remaining.length===m.clues.length?m.remaining[m.remaining.length-1]!:null,families=[...new Set(m.clues.map(c=>c.family).filter((f):f is string=>!!f))]
 const common=commonProblems(m,target)
 // ---- practice (BC-R07)
 const pb:Blocker[]=[...common]
 if(m.clues.length<PRACTICE_MIN_CLUES)add(pb,'BLIND_COW_NOT_UNIQUE',`practice needs ${PRACTICE_MIN_CLUES} sourced clues, this has ${m.clues.length}`)
 if(last!==null&&last>PRACTICE_MAX_CANDIDATES)add(pb,'BLIND_COW_NOT_UNIQUE',`${last} candidates still fit after the last clue (practice allows ${PRACTICE_MAX_CANDIDATES})`)
 if(last===0)add(pb,'AMBIGUOUS_IDENTITY','the ladder ends on zero candidates — the target itself does not fit')
 const practiceOk=pb.length===0
 // ---- competitive (BC-R06)
 const cb:Blocker[]=[...common]
 if(m.clues.length!==COMPETITIVE_CLUES)add(cb,'BLIND_COW_NOT_UNIQUE',`competitive needs exactly ${COMPETITIVE_CLUES} clues, this has ${m.clues.length}`)
 if(new Set(m.clues.map(c=>c.factKey??c.id)).size!==m.clues.length)add(cb,'BLIND_COW_NOT_UNIQUE','two clues state the same fact')
 const untyped=m.clues.filter(c=>!c.family||!c.facet||!c.factKey||!c.type).length
 if(untyped)add(cb,'BLIND_COW_NOT_UNIQUE',`${untyped} clue${untyped===1?' is':'s are'} prose only — typed fact keys are required to prove narrowing`)
 else if(families.length<COMPETITIVE_FAMILIES)add(cb,'BLIND_COW_NOT_UNIQUE',`${families.length} evidence famil${families.length===1?'y':'ies'}, competitive needs ${COMPETITIVE_FAMILIES}`)
 if(!m.remaining||m.remaining.length!==m.clues.length)add(cb,'BLIND_COW_NOT_UNIQUE','no per-prefix candidate counts: uniqueness is unproven')
 else{
  for(const r of rungs)if(r.note==='redundant')add(cb,'BLIND_COW_NOT_UNIQUE',`clue ${r.n} narrows nothing while ${r.remaining} candidates remain`,r.n)
  if(last!==1)add(cb,'BLIND_COW_NOT_UNIQUE',`${last} candidates still fit after clue ${m.clues.length}; competitive needs exactly one`)
 }
 if(!services.runtime)add(cb,'RUNTIME_UNAVAILABLE','the sealed-session / scoring service is not available')
 if(services.scoringVersion!==undefined&&!SCORING[services.scoringVersion])add(cb,'VERSION_UNSUPPORTED',`scoring version ${services.scoringVersion} cannot be honoured`)
 const kind:PracticeKind|null=!practiceOk?null:last===1?'unique':'exploration'
 return {id:m.id,clues:m.clues.length,families,finalCandidates:last,practice:{ok:practiceOk,kind,blockers:pb},competitive:{ok:cb.length===0,blockers:cb},ladder:rungs}
}

/** The distinct blocker codes of a set of evaluations with how many mysteries each stops — what the lobby and the admin print. */
export function tally(evals:readonly Evaluation[],mode:'practice'|'competitive'):{open:number;of:number;codes:{code:BlockerCode;count:number}[]}{
 const counts=new Map<BlockerCode,number>();let open=0
 for(const e of evals){const v=e[mode];if(v.ok)open++;else for(const c of new Set(v.blockers.map(b=>b.code)))counts.set(c,(counts.get(c)??0)+1)}
 return {open,of:evals.length,codes:[...counts].map(([code,count])=>({code,count})).sort((a,b)=>b.count-a.count)}
}

// ------------------------------------------------------------------ BC-R10 · the score under a named version
export type Run={rawElapsedMs:number;cluesShown:number;wrongGuesses:number}
/** weightedMs = elapsedMs + extra-clue penalty × max(0, cluesShown−1) + wrong penalty × wrongGuesses. `null` for a version we cannot honour. */
export function weighted(run:Run,version:number):number|null{
 const cfg=SCORING[version];if(!cfg)return null
 return Math.max(0,Math.round(run.rawElapsedMs))+cfg.extraHintPenaltyMs*Math.max(0,Math.trunc(run.cluesShown)-1)+cfg.wrongGuessPenaltyMs*Math.max(0,Math.trunc(run.wrongGuesses))
}
export const supportedVersion=(v:unknown):v is number=>typeof v==='number'&&Object.prototype.hasOwnProperty.call(SCORING,v)

// ------------------------------------------------------------------ BC-R13 · who won a duel
export type Side={status:'solved'|'gave_up'|'timeout'|'playing';weightedMs:number|null}
export type Outcome='a'|'b'|'tie'|'none'|'open'
/** A solver beats a non-solver; two solvers by lower weighted time; exact equality is a tie; two non-solvers: no winner. */
export function duelOutcome(a:Side,b:Side):Outcome{
 if(a.status==='playing'||b.status==='playing')return 'open'
 const as=a.status==='solved'&&a.weightedMs!==null,bs=b.status==='solved'&&b.weightedMs!==null
 if(as&&!bs)return 'a';if(bs&&!as)return 'b';if(!as&&!bs)return 'none'
 return a.weightedMs===b.weightedMs?'tie':a.weightedMs!<b.weightedMs!?'a':'b'
}
/** The 120 s hard limit of a duel (scoring v1). A run still playing past it is a timeout — never a result the player can still win. */
export function pastDeadline(startedAt:number,now:number,version:number):boolean{const cfg=SCORING[version];return !!cfg&&now-startedAt>cfg.duelMaxMs}
export const duelLimitMs=(version:number)=>SCORING[version]?.duelMaxMs??0

// ------------------------------------------------------------------ BC-R11 · a guess is a canonical id
export type Pickable={id:string;name:string;aliases?:string[];from?:number|null;to?:number|null}
/** Which entries in the picker share a display name — the picker must tell them apart (years, position), not pick one. */
export function homonyms(list:readonly Pickable[]):Set<string>{
 const by=new Map<string,string[]>()
 for(const p of list){const k=fold(p.name).toLowerCase();by.set(k,[...(by.get(k)??[]),p.id])}
 return new Set([...by.values()].filter(v=>v.length>1).flat())
}
/**
 * Resolve typed text to ONE canonical id, or say it is ambiguous. A verified alias spelling resolves; two people behind one
 * spelling is `ambiguous` (the picker must show both), never "the first one".
 */
export function resolveGuess(text:string,list:readonly Pickable[]):{kind:'one';id:string}|{kind:'ambiguous';ids:string[]}|{kind:'none'}{
 const q=fold(text).toLowerCase();if(!q)return {kind:'none'}
 const hits=list.filter(p=>[p.name,...(p.aliases??[])].some(n=>fold(n).toLowerCase()===q)).map(p=>p.id)
 const ids=[...new Set(hits)]
 return ids.length===1?{kind:'one',id:ids[0]!}:ids.length>1?{kind:'ambiguous',ids}:{kind:'none'}
}

// ------------------------------------------------------------------ BC-R09 · idempotent events
/** `reveal` carries the count the client SAW; a replay of the same request (same `have`) changes nothing. */
export const revealIsReplay=(shown:number,have:number)=>have!==shown
/** A repeated wrong guess is the same guess, not a second penalty. */
export const isRepeatGuess=(tried:readonly string[],id:string)=>tried.includes(id)

// ------------------------------------------------------------------ BC-R12 · the daily's policy, in one place
export const DAILY_POLICY={
 /** the first attempt on a club-local day is the counted one; a finished daily is revealed and replayable only as practice */
 attempts:1,
 replay:'practice' as const,
 reveal:'after-finish' as const,
}
