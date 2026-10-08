/**
 * Gate 7 · the Terrace vote, as pure rules: the eight-question slip, what the device may keep, the picker's pool,
 * the share text. No React, no server — the presenter and the tests read this one file.
 *
 * What this gate is honest about: a vote is a count, and a count needs other people. There is no club-wide table
 * behind this screen, so there is exactly one voter on it — you — and it says so. What it gives back is a SLIP:
 * your eight picks, printed, to be shared. Nothing here ever produces a percentage, a "most picked" or a baseline.
 * Everything stored is an id (a player id, a shirt number, a position code), never a label.
 */
import type {ClubPlayer} from './contract'
import {searchClubPlayers,validateXI} from './xi'

export type Pos='GK'|'DF'|'MF'|'FW'
export type Kind='player'|'number'|'position'
export type Question={id:string;kind:Kind;/** opens the picker on this documented position, as a removable chip */open:Pos|null;/** the Latin line printed on the slip's row */latin:string}

/** The order is deliberate: it opens on the question everybody already has an answer to and closes on the voter's own shirt. */
export const SLIP:readonly Question[]=[
 {id:'favourite',kind:'player',open:null,latin:'ALL-TIME FAVOURITE'},
 {id:'keeper',kind:'player',open:'GK',latin:'GOALKEEPER'},
 {id:'centreback',kind:'player',open:'DF',latin:'DEFENDER'},
 {id:'midfield',kind:'player',open:'MF',latin:'MIDFIELD'},
 {id:'striker',kind:'player',open:'FW',latin:'FORWARD'},
 {id:'cult',kind:'player',open:null,latin:'CULT HERO'},
 {id:'number',kind:'number',open:null,latin:'YOUR NUMBER'},
 {id:'position',kind:'position',open:null,latin:'YOUR POSITION'},
]
export const questionOf=(id:string)=>SLIP.find(q=>q.id===id)
export const NUMBERS:readonly number[]=Array.from({length:99},(_,i)=>i+1)
export const POSITION_CODES=['GK','CB','FB','DM','CM','AM','W','ST'] as const
export type PosCode=typeof POSITION_CODES[number]
export const isPosCode=(v:unknown):v is PosCode=>typeof v==='string'&&(POSITION_CODES as readonly string[]).includes(v)

/** A reason is an id in the voter's own voice about the voter — never free text beside a footballer's name. */
export const REASONS:Record<string,readonly string[]>={
 favourite:['childhood','moment','heart'],
 keeper:['calm','oneGame','nostalgia'],
 centreback:['leader','hard','childhood'],
 midfield:['throughHim','heart','technique'],
 striker:['oneGoal','nerve','style'],
 cult:['underrated','oneNight','mine'],
 number:['childhood','aPlayer','mine'],
 position:['me','always','wish'],
}
export const reasonsOf=(qid:string):readonly string[]=>REASONS[qid]??[]

// ------------------------------------------------------------------ the slip (device-only)
export type Slip={v:1;picks:Record<string,string>;reasons:Record<string,string>;name:string}
export const slipKey=(club:string)=>`fan-life:club:${club}:terrace:v1`
export const emptySlip=():Slip=>({v:1,picks:{},reasons:{},name:''})
export const NAME_MAX=24
export const cleanName=(v:unknown):string=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,NAME_MAX):''
/** the name as it is typed: controls stripped and capped, but not trimmed — a space must be typeable */
export const typeName=(v:string):string=>v.replace(/[\u0000-\u001f\u007f<>]/g,'').slice(0,NAME_MAX)
const validPick=(q:Question,v:unknown,ids:ReadonlySet<string>)=>typeof v==='string'&&(q.kind==='player'?ids.has(v):q.kind==='number'?/^(?:[1-9]|[1-9]\d)$/.test(v):isPosCode(v))
/** Device saves are untrusted: keep only picks this build still offers, and reasons that belong to a live pick. */
export function validateSlip(raw:unknown,players:readonly ClubPlayer[]):Slip{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return emptySlip()
 const r=raw as Record<string,unknown>,ids=new Set(players.map(p=>p.id)),out=emptySlip()
 const picks=r.picks&&typeof r.picks==='object'&&!Array.isArray(r.picks)?r.picks as Record<string,unknown>:{},why=r.reasons&&typeof r.reasons==='object'&&!Array.isArray(r.reasons)?r.reasons as Record<string,unknown>:{}
 for(const q of SLIP){
  const v=picks[q.id];if(!validPick(q,v,ids))continue
  out.picks[q.id]=v as string
  const w=why[q.id];if(typeof w==='string'&&reasonsOf(q.id).includes(w))out.reasons[q.id]=w
 }
 out.name=cleanName(r.name);return out
}
/** Choosing again replaces the pick and drops a reason that was about the old one. */
export function setPick(s:Slip,qid:string,value:string):Slip{
 const q=questionOf(qid);if(!q)return s
 const same=s.picks[qid]===value,reasons={...s.reasons};if(!same)delete reasons[qid]
 return {...s,picks:{...s.picks,[qid]:value},reasons}
}
export function clearPick(s:Slip,qid:string):Slip{const picks={...s.picks},reasons={...s.reasons};delete picks[qid];delete reasons[qid];return {...s,picks,reasons}}
/** One reason per answer; tapping it again clears it; a reason needs a pick to be about. */
export function setReason(s:Slip,qid:string,reason:string|null):Slip{
 if(!s.picks[qid])return s
 const reasons={...s.reasons};if(reason===null||s.reasons[qid]===reason||!reasonsOf(qid).includes(reason))delete reasons[qid];else reasons[qid]=reason
 return {...s,reasons}
}
export const filled=(s:Slip)=>SLIP.filter(q=>s.picks[q.id]!==undefined).length
export const isComplete=(s:Slip)=>filled(s)===SLIP.length
export const nextOpen=(s:Slip,after?:string):string|null=>{
 const from=after?SLIP.findIndex(q=>q.id===after)+1:0,order=[...SLIP.slice(from),...SLIP.slice(0,from)]
 return order.find(q=>s.picks[q.id]===undefined)?.id??null
}

// ------------------------------------------------------------------ the picker's pool
export type PoolFilter={q:string;pos:Pos|null;mine:boolean}
/** the ids of the voter's own XI (best XI), so the picker can offer "from my XI" without a second place to keep it */
export function xiIds(raw:unknown,players:readonly ClubPlayer[]):string[]{
 try{const xi=validateXI(raw,players);return [...new Set([...Object.values(xi.picks),...(xi.twelfth?[xi.twelfth]:[])])]}catch{return []}
}
/** Who the picker lists: the question's documented position as a removable chip, "my XI" as another, and a typed search over the whole roster. */
export function poolFor(players:readonly ClubPlayer[],f:PoolFilter,mine:ReadonlySet<string>):ClubPlayer[]{
 const base=f.q.trim()?searchClubPlayers(players,f.q):[...players]
 return base.filter(p=>(!f.pos||p.positions.includes(f.pos))&&(!f.mine||mine.has(p.id)))
}

// ------------------------------------------------------------------ the debates (flat map, shared with the activity panel)
export type DebateLike={id:string;choices:readonly {id:string}[]}
/** poll id → choice id, kept only where the debate and the choice still exist */
export function validateVotes(raw:unknown,debates:readonly DebateLike[]):Record<string,string>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {}
 const r=raw as Record<string,unknown>,out:Record<string,string>={}
 for(const d of debates){const v=r[d.id];if(typeof v==='string'&&d.choices.some(c=>c.id===v))out[d.id]=v}
 return out
}
export const debatesDone=(votes:Record<string,string>,debates:readonly DebateLike[])=>debates.length>0&&debates.every(d=>votes[d.id]!==undefined)

// ------------------------------------------------------------------ the share text — a slip, never a score
export function shareText(o:{club:string;title:string;name:string;rows:{label:string;value:string}[];url:string}):string{
 return [`FAN LIFE · ${o.club} · ${o.title}${o.name?` · ${o.name}`:''}`,...o.rows.map(r=>`${r.label}: ${r.value}`),o.url].join('\n')
}
