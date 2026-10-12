import {clamp,type QuotaPos} from './config'

/**
 * Stars and attributes (owner, 12.10.2026: "no rating number — 1 to 5 stars in quarters, and attributes for the role, basic and
 * fun"). Pure.
 *
 * NORMALISED ACROSS CLUBS (rulebook §1.6.37, §2.5): a club's hidden ratings are read as a PERCENTILE inside that club's own
 * draft pool, so the best man at a small club and the best man at a big one both reach five stars and every league is a contest.
 * The archive's `rating` and the frozen price list are never written (§0). The owner may shift a whole club (`offset`, ± one star)
 * or pin one man's stars and attributes from the control room.
 *
 * ATTRIBUTES ARE GAME VALUES, not history (§2.5: "do not invent historical attributes"). Each is derived from the man's stars,
 * his recorded position and — for finishing — his recorded goals at the club, with a small stable spread so two four-star
 * midfielders are not identical. The screen says so in words.
 */
export type AttrKey='reflexes'|'handling'|'distribution'|'tackling'|'marking'|'heading'|'passing'|'vision'|'stamina'|'shooting'|'finishing'|'pace'
export const ATTR_LABEL:Record<AttrKey,string>={reflexes:'Reflexes',handling:'Handling',distribution:'Distribution',tackling:'Tackling',marking:'Marking',heading:'Heading',passing:'Passing',vision:'Vision',stamina:'Stamina',shooting:'Shooting',finishing:'Finishing',pace:'Pace'}
export const ROLE_ATTRS:Record<QuotaPos,readonly AttrKey[]>={GK:['reflexes','handling','distribution'],DF:['tackling','marking','heading','passing'],MF:['passing','vision','stamina','shooting'],FW:['finishing','shooting','pace','heading']}
/** how each attribute leans for the role: the first is the role's core skill */
const LEAN:Record<QuotaPos,readonly number[]>={GK:[0.25,0,-0.5],DF:[0.25,0,-0.25,-0.5],MF:[0.25,0,0,-0.5],FW:[0.25,-0.25,0,-0.5]}
export type Attributes=Partial<Record<AttrKey,number>>
export type RatingOverride={stars?:number;attrs?:Attributes;note?:string}
export type RatingControl={v:1;clubs:Record<string,{offset:number}>;players:Record<string,RatingOverride>;updatedAt:string|null}
export const EMPTY_CONTROL:RatingControl={v:1,clubs:{},players:{},updatedAt:null}
export const quarter=(x:number)=>clamp(Math.round(x*4)/4,1,5)
/** quality on the shared 0–100 scale the match engine reads, from stars */
export const qualityOf=(stars:number)=>45+(clamp(stars,1,5)-1)*12.5

const h32=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0}
export type RateInput={id:string;position:QuotaPos;rating:number;goals:number}
export type Rated={stars:number;attrs:Record<string,number>;pinned:boolean}

/** stars for every man of one club, read against that club's own pool */
export function rateClub(club:string,pool:readonly RateInput[],control:RatingControl=EMPTY_CONTROL):Map<string,Rated>{
 const out=new Map<string,Rated>(),sorted=[...pool].map(p=>p.rating).sort((a,b)=>a-b),n=sorted.length
 const pct=(r:number)=>{if(n<2)return 0.5;let lo=0,hi=n;while(lo<hi){const m=(lo+hi)>>1;if(sorted[m]!<r)lo=m+1;else hi=m}let eq=lo;while(eq<n&&sorted[eq]===r)eq++;return ((lo+eq-1)/2)/(n-1)}
 const offset=clamp(control.clubs[club]?.offset??0,-1,1)
 const goals=pool.filter(p=>p.position!=='GK').map(p=>p.goals).sort((a,b)=>a-b),gPct=(g:number)=>g<=0||!goals.length?0:goals.filter(x=>x<g).length/goals.length
 for(const p of pool){
  const pin=control.players[`${club}:${p.id}`]
  // the curve gives the club a real top: about one man in twelve reaches 4½ stars, the middle sits near three
  const base=1+4*Math.pow(pct(p.rating),1.15)
  const stars=quarter(pin?.stars??base+offset)
  const attrs:Record<string,number>={}
  ROLE_ATTRS[p.position].forEach((k,i)=>{
   const spread=((h32(`${club}:${p.id}:${k}`)%5)-2)*0.25
   let v=stars+LEAN[p.position][i]!+spread
   if(k==='finishing')v+=gPct(p.goals)*0.75-0.25
   attrs[k]=quarter(pin?.attrs?.[k]??v)
  })
  out.set(p.id,{stars,attrs,pinned:!!pin})
 }
 return out
}
/** read a control document from storage; anything malformed is dropped by name, never guessed */
export function readControl(raw:unknown):RatingControl{
 const r=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>,clubs:RatingControl['clubs']={},players:RatingControl['players']={}
 for(const [k,v] of Object.entries((r.clubs??{}) as Record<string,unknown>)){const o=(v as {offset?:unknown})?.offset;if(/^[a-z0-9-]{2,60}$/.test(k)&&typeof o==='number'&&o>=-1&&o<=1)clubs[k]={offset:quarter(o+3)-3}}
 for(const [k,v] of Object.entries((r.players??{}) as Record<string,unknown>)){
  if(!/^[a-z0-9-]{2,60}:.{1,200}$/.test(k)||!v||typeof v!=='object')continue
  const o=v as Record<string,unknown>,row:RatingOverride={}
  if(typeof o.stars==='number'&&o.stars>=1&&o.stars<=5)row.stars=quarter(o.stars)
  if(o.attrs&&typeof o.attrs==='object'){const a:Attributes={};for(const [ak,av] of Object.entries(o.attrs as Record<string,unknown>))if(ak in ATTR_LABEL&&typeof av==='number'&&av>=1&&av<=5)a[ak as AttrKey]=quarter(av);if(Object.keys(a).length)row.attrs=a}
  if(typeof o.note==='string'&&o.note.trim())row.note=o.note.trim().slice(0,200)
  if(row.stars!==undefined||row.attrs)players[k]=row
 }
 return {v:1,clubs,players,updatedAt:typeof r.updatedAt==='string'?r.updatedAt:null}
}
