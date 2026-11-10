import {GATE_METHOD} from '@/lib/club-research/plan'
import {SHARED_GATES,type GateKey} from '@/lib/clubs/gates'
import type {Batch,Promotion,RivalCandidate,StagedDecisions} from './staged/model'

/**
 * THE RESEARCH DESK read model (10.11.2026, owner: "the decision stays with me, but give me easy access — simple, click
 * only, one step at a time"). Pure: every input is passed in, so the order of the line and the wording of each step are
 * tested without a server. One question per club, always the same shape — what is waiting, what a yes opens, the button.
 */
export type GateState='open'|'ready'|'soon'|'closed'
export type DeskGate={key:GateKey;number:number;name:string;state:GateState;eligible:number;target:number}
export type DeskStep=
 |{kind:'approve';batch:Batch;opens:GateKey[]}
 |{kind:'changed';batch:Batch}
 |{kind:'rival';candidates:RivalCandidate[];others:string[]}
 |{kind:'open';gates:number[]}
 |{kind:'opening';state:'waiting'|'running'|'failed';pr:number|null;reason:string|null}
 |{kind:'collecting';text:string}
 |{kind:'done';text:string}
export type DeskBatch=Batch&{state:'waiting'|'approved'|'changed';opens:GateKey[]}
export type DeskClub={id:string;name:string;country:string;primary:string;line:'new'|'open';status:string;version:number
 gates:DeskGate[];playable:number;openNow:number;potential:number
 batches:DeskBatch[];rival:{chosen:string|null;candidates:RivalCandidate[];others:string[]}
 step:DeskStep;improve:{key:GateKey;number:number;name:string;eligible:number;target:number;what:string;auto:boolean}[]
 collection:{uefaMatches:number;historyMatches:number;alarm:string|null}
 /** review D05: who the archive holds and who still waits for a second source — never lowered to look complete */
 coverage:Coverage|null}
export type Coverage={players:number;approved:number;waiting:number;noPosition:number}
export type Desk={waiting:DeskClub[];line:DeskClub[];open:DeskClub[];kpis:{waiting:number;inLine:number;openClubs:number;gatesOpen:number;couldOpen:number};health:string[]}

export type GateInput={key:GateKey;number:number;state:string;eligible:number;target:number;playable:boolean;openNow:boolean}
export type ClubInput={id:string;name:string;country:string;primary:string;status:string;version:number;gatesOn:number[];staged:boolean
 gates:GateInput[];after:GateInput[]|null;batches:Batch[];perBatch:Record<string,GateKey[]>;decisions:StagedDecisions|null
 rivals:RivalCandidate[];opponents:string[];uefaMatches:number;historyMatches:number;alarm:string|null;coverage?:Coverage|null}

const NAME=Object.fromEntries(SHARED_GATES.map(g=>[g.key,g.name])) as Record<GateKey,string>
export const gateName=(k:GateKey)=>NAME[k]
/** Gates research can grow without anyone — the daily pull widens line-ups, timelines, trivia and Blind Cow by itself. */
const AUTO_GROWS=new Set<GateKey>(['lineup','trivia','timeline','archive','memory','blind-cow','polls'])
/** one line the owner can act on: how many people a second source would open to the archive, trivia and Blind Cow */
export function coverageText(c:Coverage):string{
 const parts=[`${c.approved} of ${c.players} players are in the archive`]
 if(c.waiting)parts.push(`${c.waiting} wait for a second source (confidence 1)`)
 if(c.noPosition)parts.push(`${c.noPosition} have no recorded position`)
 return parts.join(' · ')+'.'
}
/** What the full opening puts in place after the owner's click (scripts/clubs/promote.ts) — said on the card before and after. */
export const OPENING_PARTS='the crest, the hub tile, the club pages, LIFE, Royal Rumble prices, ALL FOOTBALL and LEGENDS, the next-match card and the social plan'
const stateOf=(g:GateInput,after:GateInput|undefined):GateState=>g.openNow?'open':g.playable?'ready':after?.playable?'soon':'closed'

export function deskClub(c:ClubInput):DeskClub{
 const after=new Map((c.after||[]).map(g=>[g.key,g]))
 const gates:DeskGate[]=c.gates.map(g=>({key:g.key,number:g.number,name:NAME[g.key],state:stateOf(g,after.get(g.key)),eligible:g.eligible,target:g.target}))
 const d=c.decisions
 // what a yes opens is counted against what already plays NOW (the preview compares each batch with no decision at all)
 const playsNow=new Set(c.gates.filter(g=>g.playable).map(g=>g.key))
 const batches:DeskBatch[]=c.batches.map(b=>{const dec=d?.batches.find(x=>x.id===b.id);return {...b,state:!dec?'waiting':dec.hash===b.hash?'approved':'changed',opens:(c.perBatch[b.id]||[]).filter(k=>!playsNow.has(k))}})
 const playable=gates.filter(g=>g.state==='open'||g.state==='ready').length,openNow=gates.filter(g=>g.state==='open').length
 const potential=playable+gates.filter(g=>g.state==='soon').length
 const waiting=batches.filter(b=>b.state==='waiting'&&b.count>0).sort((a,b)=>b.opens.length-a.opens.length||b.count-a.count)
 const changed=batches.find(b=>b.state==='changed')
 const derby=c.gates.find(g=>g.key==='derby')
 const canOpen=c.gates.filter(g=>g.playable&&!g.openNow).map(g=>g.number)
 let step:DeskStep
 const p:Promotion|null|undefined=d?.promotion
 if(c.staged&&c.status==='live')step={kind:'opening',state:p?.state==='failed'?'failed':p?.state==='running'?'running':'waiting',pr:p?.pr??null,reason:p?.reason??null}
 else if(changed)step={kind:'changed',batch:changed}
 else if(waiting[0])step={kind:'approve',batch:waiting[0],opens:waiting[0].opens}
 else if(c.staged&&!d?.rival&&!derby?.playable&&c.rivals.length)step={kind:'rival',candidates:c.rivals,others:c.opponents}
 else if(canOpen.length)step={kind:'open',gates:canOpen}
 else if(c.staged)step={kind:'collecting',text:c.alarm||'Nothing waits for you here. The daily pull keeps adding UEFA line-ups and positions; new material comes back to this page.'}
 else step={kind:'done',text:openNow===13?'All thirteen gates are open.':'Nothing waits for you here. The daily pull keeps adding what it can.'}
 const improve=c.staged?[]:c.gates.filter(g=>g.state!=='READY').map(g=>({key:g.key,number:g.number,name:NAME[g.key],eligible:g.eligible,target:g.target,what:GATE_METHOD[g.key].what,auto:AUTO_GROWS.has(g.key)}))
  .sort((a,b)=>(b.target?b.eligible/b.target:0)-(a.target?a.eligible/a.target:0))
 return {id:c.id,name:c.name,country:c.country,primary:c.primary,line:c.staged?'new':'open',status:c.status,version:c.version,gates,playable,openNow,potential,batches,
  rival:{chosen:d?.rival?.name??null,candidates:c.rivals,others:c.opponents},step,improve,collection:{uefaMatches:c.uefaMatches,historyMatches:c.historyMatches,alarm:c.alarm},coverage:c.coverage??null}
}

/** The whole desk: what waits for the owner first (most gates a click opens), then the line of new clubs, then the open ones. */
export function buildDesk(clubs:ClubInput[],health:string[]=[]):Desk{
 const all=clubs.map(deskClub)
 const asks=(c:DeskClub)=>['approve','changed','rival','open'].includes(c.step.kind)||(c.step.kind==='opening'&&c.step.state==='failed')
 const gain=(c:DeskClub)=>c.step.kind==='approve'?c.step.opens.length:c.step.kind==='open'?c.step.gates.length:c.step.kind==='rival'?1:0
 const waiting=all.filter(asks).sort((a,b)=>gain(b)-gain(a)||b.potential-a.potential||a.name.localeCompare(b.name))
 const line=all.filter(c=>c.line==='new').sort((a,b)=>b.potential-a.potential||a.name.localeCompare(b.name))
 const open=all.filter(c=>c.line==='open').sort((a,b)=>a.name.localeCompare(b.name))
 return {waiting,line,open,health,kpis:{waiting:waiting.length,inLine:line.length,openClubs:all.filter(c=>c.status==='live').length,gatesOpen:all.reduce((n,c)=>n+c.openNow,0),couldOpen:line.reduce((n,c)=>n+c.potential,0)}}
}

/** One sentence for a step — the same words on the card, in the report and in the test. */
export function stepText(c:DeskClub):string{
 const s=c.step,names=(k:GateKey[])=>k.map(x=>NAME[x]).join(', ')
 switch(s.kind){
  case 'approve':return `${s.batch.title}. ${s.opens.length?`Approving opens ${s.opens.length} ${s.opens.length===1?'gate':'gates'}: ${names(s.opens)}.`:'Approving adds them to the archive; no gate opens on this alone.'}`
  case 'changed':return `${s.batch.title} — the material changed after you approved it. Look again: it waits for a new yes.`
  case 'rival':return `Who is ${c.name}’s rival? Pick one and the derby gate opens.`
  case 'open':return `${s.gates.length} ${s.gates.length===1?'gate is':'gates are'} ready to play. ${c.status==='live'?'Switch them on for fans.':`Open ${c.name} to fans — the games are live at once, and ${OPENING_PARTS} follow by themselves within about an hour.`}`
  case 'opening':return s.state==='failed'?`The full opening of ${c.name} stopped${s.reason?`: ${s.reason}`:'.'} The games stay open. Press “Try again” to run it once more.`:`${c.name} is open. Putting in place ${OPENING_PARTS} — done within about an hour, no action needed.`
  case 'collecting':case 'done':return s.text
 }
}
