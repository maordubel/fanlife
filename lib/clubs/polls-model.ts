/**
 * Gate 7 · the Terrace vote, as pure rules (universal rulebook §9, PO-R01..R10): the dealt ballot, the slip the device
 * keeps, the picker's pool, the debates. No React, no server — the presenter and the tests read this one file.
 *
 *  · It is an OPINION. Nothing here has a right answer, a life, a clock or a score (PO-R01).
 *  · The ballot is DEALT from the club's own roster: a line is in it only when at least two documented players could
 *    be its answer (PO-R02); a centre-back line needs evidence finer than DF, else the line becomes a different,
 *    honestly named "defender" line (PO-R03); "foreign" follows the club's own foreign-slot record, never a passport.
 *  · A number (1–99) and a position are the voter's own — they claim nothing about who wore what (PO-R04).
 *  · Progress, summary and analytics use the dealt length, not a constant (PO-R05).
 *  · Everything stored is an id, never a label; a pick carries the prompt VERSION it was made under, and a changed
 *    version retires the old pick into a receipt instead of moving it onto a new player (PO-R09).
 * Counting lives in `polls-votes.ts`. This file never produces a percentage or a baseline.
 */
import type {ClubPlayer} from './contract'
import {searchClubPlayers,validateXI} from './xi'

export type Pos='GK'|'DF'|'MF'|'FW'
export type Kind='player'|'number'|'position'
/** What a documented player must show to be a choice on a line. `{}` = anybody on the roster. */
export type Need={pos?:Pos;centreBack?:boolean;foreign?:boolean}
export type Question={id:string;kind:Kind;need:Need|null;/** the Latin line printed on the slip's row */latin:string;/** the prompt version: the definition + the exact choice set (PO-R09) */version:string}

// ------------------------------------------------------------------ the catalogue the ballot is dealt from
type Def={id:string;kind:Kind;need:Need|null;latin:string}
const DEF:Record<string,Def>={
 favourite:{id:'favourite',kind:'player',need:{},latin:'ALL-TIME FAVOURITE'},
 keeper:{id:'keeper',kind:'player',need:{pos:'GK'},latin:'GOALKEEPER'},
 centreback:{id:'centreback',kind:'player',need:{centreBack:true},latin:'CENTRE-BACK'},
 /** the coarse fallback: a different question with a different id (PO-R03) */
 defender:{id:'defender',kind:'player',need:{pos:'DF'},latin:'DEFENDER'},
 midfield:{id:'midfield',kind:'player',need:{pos:'MF'},latin:'MIDFIELD'},
 striker:{id:'striker',kind:'player',need:{pos:'FW'},latin:'FORWARD'},
 foreign:{id:'foreign',kind:'player',need:{foreign:true},latin:'FOREIGN PLAYER'},
 number:{id:'number',kind:'number',need:null,latin:'YOUR NUMBER'},
 position:{id:'position',kind:'position',need:null,latin:'YOUR POSITION'},
}
/** The native order opens on the question everybody already has an answer to and closes on the voter's own shirt. */
const NATIVE=['favourite','keeper','centreback','midfield','striker','foreign','number','position'] as const
export const MIN_CHOICES=2
export const NUMBERS:readonly number[]=Array.from({length:99},(_,i)=>i+1)
export const POSITION_CODES=['GK','CB','FB','DM','CM','AM','W','ST'] as const
export type PosCode=typeof POSITION_CODES[number]
export const isPosCode=(v:unknown):v is PosCode=>typeof v==='string'&&(POSITION_CODES as readonly string[]).includes(v)
export const isNumberPick=(v:unknown):v is string=>typeof v==='string'&&/^(?:[1-9]|[1-9]\d)$/.test(v)

/** Does this documented player fit the line? Unknown evidence is a "no", never a guess. */
export function fits(p:ClubPlayer,need:Need|null):boolean{
 if(!need)return true
 if(need.pos&&!p.positions.includes(need.pos))return false
 if(need.centreBack&&p.detail?.centreBack!==true)return false
 if(need.foreign&&p.detail?.foreignSlot!=='foreign')return false
 return true
}
const fnv=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(36)}
/** The version of a line = a hash of its definition and the ids that may answer it. Adding or removing a choice is a new version. */
export const versionOf=(def:string,ids:readonly string[])=>fnv(`${def}|${[...ids].sort().join(',')}`)

export type Off={id:string;code:'POLL_CHOICES_SHORT';have:number;need:number;/** the honestly named replacement that took its place, when there is one */renamedTo?:string}
export type Ballot={questions:readonly Question[];off:readonly Off[];length:number}
const dealt=(d:Def,players:readonly ClubPlayer[]):{q:Question;have:number}=>{
 const ids=d.kind==='player'?players.filter(p=>fits(p,d.need)).map(p=>p.id):[]
 return {q:{...d,version:d.kind==='player'?versionOf(d.id,ids):d.kind==='number'?'n1':'p1'},have:ids.length}
}
/**
 * Deal the ballot for a roster. A line with fewer than two eligible choices is not a poll (PO-R02): it is left out and
 * reported as `POLL_CHOICES_SHORT`; a centre-back line without finer evidence is swapped for the "defender" line.
 */
export function dealBallot(players:readonly ClubPlayer[]):Ballot{
 const questions:Question[]=[],off:Off[]=[]
 for(const id of NATIVE){
  const d=DEF[id]!,first=dealt(d,players)
  if(d.kind!=='player'||first.have>=MIN_CHOICES){questions.push(first.q);continue}
  if(id==='centreback'){
   const alt=dealt(DEF.defender!,players)
   if(alt.have>=MIN_CHOICES){questions.push(alt.q);off.push({id,code:'POLL_CHOICES_SHORT',have:first.have,need:MIN_CHOICES,renamedTo:'defender'});continue}
   off.push({id,code:'POLL_CHOICES_SHORT',have:first.have,need:MIN_CHOICES});off.push({id:'defender',code:'POLL_CHOICES_SHORT',have:alt.have,need:MIN_CHOICES});continue
  }
  off.push({id,code:'POLL_CHOICES_SHORT',have:first.have,need:MIN_CHOICES})
 }
 return {questions,off,length:questions.length}
}
/** The only people who may answer a line. */
export const choicesFor=(players:readonly ClubPlayer[],q:Question):ClubPlayer[]=>q.kind==='player'?players.filter(p=>fits(p,q.need)):[]
export const questionOf=(b:Ballot,id:string)=>b.questions.find(q=>q.id===id)

/** A reason is an id in the voter's own voice about the voter — never free text beside a footballer's name. */
export const REASONS:Record<string,readonly string[]>={
 favourite:['childhood','moment','heart'],
 keeper:['calm','oneGame','nostalgia'],
 centreback:['leader','hard','childhood'],
 defender:['leader','hard','childhood'],
 midfield:['throughHim','heart','technique'],
 striker:['oneGoal','nerve','style'],
 foreign:['arrived','magic','mine'],
 number:['childhood','aPlayer','mine'],
 position:['me','always','wish'],
}
export const reasonsOf=(qid:string):readonly string[]=>REASONS[qid]??[]

// ------------------------------------------------------------------ the slip (device-only)
/** An earlier pick that belongs to a version no longer on offer (PO-R09). `retired` = the choice itself is gone. */
export type Receipt={qid:string;choice:string;pv:string;retired:boolean}
export type Slip={
 v:2
 /** a random per-device id: the measurement unit of "one active vote" (PO-R06) — device dedup is not proof of one person */
 voter:string
 picks:Record<string,string>
 /** the prompt version each live pick was made under */
 pv:Record<string,string>
 /** the idempotency key each live pick was (or will be) sent with */
 keys:Record<string,string>
 /** the last key a tally accepted for the line — a pick whose key differs is not counted yet (PO-R08) */
 sent:Record<string,string>
 reasons:Record<string,string>
 receipts:Receipt[]
 name:string
}
export const slipKey=(club:string)=>`fan-life:club:${club}:terrace:v2`
export const emptySlip=():Slip=>({v:2,voter:'',picks:{},pv:{},keys:{},sent:{},reasons:{},receipts:[],name:''})
export const NAME_MAX=24
export const cleanName=(v:unknown):string=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,NAME_MAX):''
/** the name as it is typed: controls stripped and capped, but not trimmed — a space must be typeable */
export const typeName=(v:string):string=>v.replace(/[\u0000-\u001f\u007f<>]/g,'').slice(0,NAME_MAX)
const rec=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{}
const str=(v:unknown,max=80)=>typeof v==='string'&&v.length>0&&v.length<=max?v:null
const validPick=(q:Question,v:unknown,ids:ReadonlySet<string>)=>typeof v==='string'&&(q.kind==='player'?ids.has(v):q.kind==='number'?isNumberPick(v):isPosCode(v))
/** The idempotency key of one vote: the same (voter, club, line, version, choice) always names the same key, so a retry cannot double-count. */
export const voteKey=(club:string,qid:string,pv:string,choice:string,voter:string)=>`v1.${fnv(`${club}|${qid}|${pv}|${choice}|${voter}`)}${fnv(`${voter}|${choice}|${pv}|${qid}|${club}`)}`

/**
 * Device saves are untrusted. A pick survives only when its line is still dealt AND it was made under the line's current
 * version; otherwise it becomes a RECEIPT (kept, shown, never transferred to anyone else). Reasons follow live picks only.
 */
export function validateSlip(raw:unknown,players:readonly ClubPlayer[],ballot:Ballot):Slip{
 const r=rec(raw);if(r.v!==2)return emptySlip()
 const out=emptySlip(),ids=new Set(players.map(p=>p.id)),picks=rec(r.picks),pv=rec(r.pv),keys=rec(r.keys),sent=rec(r.sent),why=rec(r.reasons)
 out.voter=typeof r.voter==='string'&&/^[a-z0-9]{8,24}$/.test(r.voter)?r.voter:''
 const old=Array.isArray(r.receipts)?r.receipts.slice(0,60):[]
 for(const x of old){const o=rec(x),qid=str(o.qid,24),choice=str(o.choice,64),v=str(o.pv,24);if(qid&&choice&&v)out.receipts.push({qid,choice,pv:v,retired:o.retired===true})}
 for(const [qid,choice] of Object.entries(picks)){
  const q=questionOf(ballot,qid),made=str(pv[qid],24)
  if(typeof choice!=='string'||choice.length>64)continue
  if(made===null)continue
  if(!q){if(!out.receipts.some(x=>x.qid===qid&&x.pv===made&&x.choice===choice))out.receipts.push({qid,choice,pv:made,retired:true});continue}
  if(made!==q.version){
   // a changed prompt: the old pick is a receipt; it is "retired" when that player cannot answer the new line
   const still=q.kind==='player'?choicesFor(players,q).some(p=>p.id===choice):validPick(q,choice,ids)
   if(!out.receipts.some(x=>x.qid===qid&&x.pv===made&&x.choice===choice))out.receipts.push({qid,choice,pv:made,retired:!still})
   continue
  }
  if(!validPick(q,choice,ids))continue
  if(q.kind==='player'&&!choicesFor(players,q).some(p=>p.id===choice))continue
  out.picks[qid]=choice;out.pv[qid]=made
  const k=str(keys[qid],60);if(k)out.keys[qid]=k
  const s=str(sent[qid],60);if(s&&s===out.keys[qid])out.sent[qid]=s
  const w=why[qid];if(typeof w==='string'&&reasonsOf(qid).includes(w))out.reasons[qid]=w
 }
 out.receipts=out.receipts.slice(-30);out.name=cleanName(r.name);return out
}
/**
 * Choosing replaces the live pick for this (line, version) — one active vote, never two (PO-R06) — drops a reason about
 * the old pick, and mints the idempotency key of the new one. `voter` must already exist (the screen creates it once).
 */
export function setPick(s:Slip,q:Question,value:string,ctx:{club:string;voter:string}):Slip{
 const same=s.picks[q.id]===value&&s.pv[q.id]===q.version,reasons={...s.reasons};if(!same)delete reasons[q.id]
 const keys={...s.keys},sent={...s.sent}
 if(!same){keys[q.id]=voteKey(ctx.club,q.id,q.version,value,ctx.voter);delete sent[q.id]}
 return {...s,voter:s.voter||ctx.voter,picks:{...s.picks,[q.id]:value},pv:{...s.pv,[q.id]:q.version},keys,sent,reasons}
}
export function clearPick(s:Slip,qid:string):Slip{
 const drop=<T,>(m:Record<string,T>)=>{const c={...m};delete c[qid];return c}
 return {...s,picks:drop(s.picks),pv:drop(s.pv),keys:drop(s.keys),sent:drop(s.sent),reasons:drop(s.reasons)}
}
/** One reason per answer; tapping it again clears it; a reason needs a pick to be about. */
export function setReason(s:Slip,qid:string,reason:string|null):Slip{
 if(!s.picks[qid])return s
 const reasons={...s.reasons};if(reason===null||s.reasons[qid]===reason||!reasonsOf(qid).includes(reason))delete reasons[qid];else reasons[qid]=reason
 return {...s,reasons}
}
/** the receipts for a line that belong to an earlier version (never the live pick) */
export const receiptsFor=(s:Slip,qid:string)=>s.receipts.filter(r=>r.qid===qid&&r.pv!==s.pv[qid])
export const filled=(s:Slip,b:Ballot)=>b.questions.filter(q=>s.picks[q.id]!==undefined).length
export const isComplete=(s:Slip,b:Ballot)=>b.length>0&&filled(s,b)===b.length
export const nextOpen=(s:Slip,b:Ballot,after?:string):string|null=>{
 const qs=b.questions,from=after?qs.findIndex(q=>q.id===after)+1:0,order=[...qs.slice(from),...qs.slice(0,from)]
 return order.find(q=>s.picks[q.id]===undefined)?.id??null
}
export type Standing='counted'|'device'
/** Where a live pick stands: counted ONLY when a tally accepted exactly this key; everything else is a slip on this device (PO-R08). */
export const standingOf=(s:Slip,qid:string):Standing|null=>s.picks[qid]===undefined?null:s.sent[qid]!==undefined&&s.sent[qid]===s.keys[qid]?'counted':'device'
/** the picks a tally has not accepted yet — what a reconnect must send, with the SAME keys */
export const pending=(s:Slip,b:Ballot)=>b.questions.filter(q=>s.picks[q.id]!==undefined&&standingOf(s,q.id)==='device')

// ------------------------------------------------------------------ the picker's pool
export type PoolFilter={q:string;mine:boolean}
/** the ids of the voter's own XI (best XI), so the picker can offer "from my XI" without a second place to keep it */
export function xiIds(raw:unknown,players:readonly ClubPlayer[]):string[]{
 try{const xi=validateXI(raw,players);return [...new Set([...Object.values(xi.picks),...(xi.twelfth?[xi.twelfth]:[])])]}catch{return []}
}
/** Who the picker lists: only the line's eligible people, narrowed by a typed search and optionally by "my XI". */
export function poolFor(eligible:readonly ClubPlayer[],f:PoolFilter,mine:ReadonlySet<string>):ClubPlayer[]{
 const base=f.q.trim()?searchClubPlayers(eligible,f.q):[...eligible]
 return base.filter(p=>!f.mine||mine.has(p.id))
}

// ------------------------------------------------------------------ the debates (flat map, shared with the activity panel)
export type DebateLike={id:string;choices:readonly {id:string;name?:string}[]}
/** Debates reason from fixed ids (PO-R10): why a fan sided as they did, never a free text beside a named person. */
export const DEBATE_REASONS=['heart','proof','era'] as const
export const isDebateReason=(v:unknown):v is typeof DEBATE_REASONS[number]=>typeof v==='string'&&(DEBATE_REASONS as readonly string[]).includes(v)
/** A debate is usable only with two or more DISTINCT choices (PO-R02); duplicates (by id) collapse to one. */
export function usableDebates<T extends DebateLike>(list:readonly T[]):T[]{
 return list.map(d=>({...d,choices:[...new Map(d.choices.map(c=>[c.id,c])).values()]})).filter(d=>d.choices.length>=MIN_CHOICES) as T[]
}
/** the version of a debate = the exact set of choices it offered */
export const debateVersion=(d:DebateLike)=>versionOf(d.id,d.choices.map(c=>c.id))
/** poll id → choice id, kept only where the debate and the choice still exist */
export function validateVotes(raw:unknown,debates:readonly DebateLike[]):Record<string,string>{
 const r=rec(raw),out:Record<string,string>={}
 for(const d of debates){const v=r[d.id];if(typeof v==='string'&&d.choices.some(c=>c.id===v))out[d.id]=v}
 return out
}
export const debatesDone=(votes:Record<string,string>,debates:readonly DebateLike[])=>debates.length>0&&debates.every(d=>votes[d.id]!==undefined)
/** debate reasons and the version each answer was made under live beside the slip (never in the shared flat vote map) */
export const reasonKey=(club:string)=>`fan-life:club:${club}:terrace:debates:v1`
export type DebateMade={pv:string;choice:string}
export type DebateState={
 /** the ACTIVE answers: made under the debate's current version and still on offer */
 votes:Record<string,string>
 why:Record<string,string>
 made:Record<string,DebateMade>
 /** an earlier answer whose options have since changed — kept and shown, never moved onto another choice (PO-R09) */
 receipts:Record<string,{choice:string;pv:string;retired:boolean}>
}
export const emptyDebateState=():DebateState=>({votes:{},why:{},made:{},receipts:{}})
/**
 * Read the shared flat vote map and this gate's own meta. A flat answer with no recorded version (made before this gate
 * kept one, or by the activity panel) is adopted under the current version; one made under an older version is a receipt.
 */
export function readDebates(flat:unknown,meta:unknown,debates:readonly DebateLike[]):DebateState{
 const f=rec(flat),m=rec(meta),why=rec(m.why),made=rec(m.made),out=emptyDebateState()
 for(const d of debates){
  const choice=f[d.id];if(typeof choice!=='string')continue
  const pv=debateVersion(d),mm=rec(made[d.id]),was=typeof mm.pv==='string'&&mm.choice===choice?mm.pv:pv,on=d.choices.some(c=>c.id===choice)
  if(was===pv&&on){out.votes[d.id]=choice;out.made[d.id]={pv,choice};const w=why[d.id];if(isDebateReason(w))out.why[d.id]=w}
  else out.receipts[d.id]={choice,pv:was,retired:!on}
 }
 return out
}
/** Answering again replaces the answer (one active vote per debate version) and drops a reason about the old one. */
export function answerDebate(st:DebateState,d:DebateLike,choice:string):DebateState{
 if(!d.choices.some(c=>c.id===choice))return st
 const why={...st.why},receipts={...st.receipts};if(st.votes[d.id]!==choice)delete why[d.id];delete receipts[d.id]
 return {votes:{...st.votes,[d.id]:choice},why,made:{...st.made,[d.id]:{pv:debateVersion(d),choice}},receipts}
}
export function reasonDebate(st:DebateState,id:string,reason:string|null):DebateState{
 if(!st.votes[id])return st
 const why={...st.why};if(reason===null||st.why[id]===reason||!isDebateReason(reason))delete why[id];else why[id]=reason
 return {...st,why}
}

// ------------------------------------------------------------------ the share text — a slip, never a score
export function shareText(o:{club:string;title:string;name:string;rows:{label:string;value:string}[];url:string}):string{
 return [`FAN LIFE · ${o.club} · ${o.title}${o.name?` · ${o.name}`:''}`,...o.rows.map(r=>`${r.label}: ${r.value}`),o.url].join('\n')
}
