import {BLANK,COLLARS,PATTERNS,colourKey,type ClothSpec,type ColourKey,type Ink} from './kit-model'

/**
 * Gate 5 · The Kit Studio — the pure half: the editor's history, the device-local stores, validation of what comes
 * back out of storage, and the creative briefs. Client-safe (storage calls are guarded; nothing here reads club data).
 *
 * A supporter's design is a FAN DESIGN: it is stored apart from the archive, carries no season and no source, and is
 * never presented as a historical fact. A design that comes back from storage is re-validated against the club's own
 * safe palette (rule 95) — a hand-edited save cannot bring a rival's colour onto a club page.
 */
export const DESIGN_MAX=24,NAME_MAX=12
export const designsKey=(club:string)=>`fan-life:club:${club}:kit-designs:v1`
export const builtKey=(club:string)=>`fan-life:club:${club}:kit-built:v1`
export const studioViewKey=(club:string)=>`fan-life:club:${club}:kit-studio-view:v1`

// ------------------------------------------------------------------ the editor's history
export type History={past:ClothSpec[];present:ClothSpec;future:ClothSpec[]}
const HISTORY_MAX=60
export const startHistory=(present:ClothSpec=BLANK):History=>({past:[],present,future:[]})
const same=(a:ClothSpec,b:ClothSpec)=>JSON.stringify(a)===JSON.stringify(b)
export function edit(h:History,patch:Partial<ClothSpec>):History{
 const next={...h.present,...patch}
 return same(next,h.present)?h:{past:[...h.past,h.present].slice(-HISTORY_MAX),present:next,future:[]}
}
export function undo(h:History):History{const p=h.past[h.past.length-1];return p?{past:h.past.slice(0,-1),present:p,future:[h.present,...h.future]}:h}
export function redo(h:History):History{const n=h.future[0];return n?{past:[...h.past,h.present],present:n,future:h.future.slice(1)}:h}
export const resetTo=(h:History,to:ClothSpec=BLANK):History=>same(h.present,to)?h:{past:[...h.past,h.present].slice(-HISTORY_MAX),present:to,future:[]}

// ------------------------------------------------------------------ the safe palette and documented parts
export type StudioLimits={colours:ColourKey[];makers:string[];sponsors:string[]}
const trimText=(v:unknown,max:number)=>typeof v==='string'&&v.trim()?v.trim().slice(0,max):null
/** Re-validate a spec that came out of storage or off a link: every field is checked against the club's own limits. */
export function validateSpec(raw:unknown,limits:StudioLimits):ClothSpec|null{
 if(!raw||typeof raw!=='object')return null
 const r=raw as Record<string,unknown>
 const colour=(v:unknown)=>{const k=typeof v==='string'?colourKey(v):null;return k&&limits.colours.includes(k)?k:null}
 const ink=(v:unknown):Ink=>v==='trim'?'trim':'base'
 const base=colour(r.base),trim=colour(r.trim)
 if(r.base!==null&&r.base!==undefined&&!base)return null
 if(r.trim!==null&&r.trim!==undefined&&!trim)return null
 const pattern=PATTERNS.find(p=>p===r.pattern),collar=COLLARS.find(c=>c===r.collar)
 if(!pattern||!collar)return null
 const maker=trimText(r.maker,40),sponsor=trimText(r.sponsor,40)
 if(maker&&!limits.makers.includes(maker))return null
 if(sponsor&&!limits.sponsors.includes(sponsor))return null
 const number=typeof r.number==='number'&&Number.isInteger(r.number)&&r.number>=0&&r.number<=99?r.number:null
 return {base,trim:base&&trim&&trim!==base?trim:null,pattern,collar,collarInk:ink(r.collarInk),sleeveInk:ink(r.sleeveInk),maker,sponsor,crest:r.crest===true,name:trimText(r.name,NAME_MAX),number}
}

// ------------------------------------------------------------------ saved designs
export type SavedDesign={id:string;name:string;spec:ClothSpec;/** the archive shirt it started from, if any */from:string|null;at:string;updated:string}
function store():Storage|null{try{return typeof localStorage==='undefined'?null:localStorage}catch{return null}}
export function readDesigns(club:string,limits:StudioLimits):SavedDesign[]{
 const s=store();if(!s)return []
 try{
  const raw=s.getItem(designsKey(club));if(!raw||raw.length>300000)return []
  const rows=JSON.parse(raw) as unknown
  if(!Array.isArray(rows))return []
  return rows.slice(0,DESIGN_MAX).flatMap(row=>{
   if(!row||typeof row!=='object')return []
   const r=row as Record<string,unknown>,spec=validateSpec(r.spec,limits)
   if(!spec||typeof r.id!=='string'||r.id.length>40)return []
   return [{id:r.id,name:trimText(r.name,32)??'',spec,from:typeof r.from==='string'&&r.from.length<120?r.from:null,at:typeof r.at==='string'?r.at.slice(0,30):'',updated:typeof r.updated==='string'?r.updated.slice(0,30):''}]
  })
 }catch{return []}
}
export function writeDesigns(club:string,rows:SavedDesign[]):boolean{
 const s=store();if(!s)return false
 try{s.setItem(designsKey(club),JSON.stringify(rows.slice(0,DESIGN_MAX)));return true}catch{return false}
}
/** insert or replace by id; newest first; the cap drops the oldest */
export function upsertDesign(rows:SavedDesign[],d:SavedDesign):SavedDesign[]{return [d,...rows.filter(r=>r.id!==d.id)].slice(0,DESIGN_MAX)}
export const newDesignId=()=>`d${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`

// ------------------------------------------------------------------ the shirts the supporter has built in gate 4
export type Built={/** server-minted proof */t:string;/** best score */s:number;/** ever built perfectly */p:boolean;at:string}
export function readBuilt(club:string):Record<string,Built>{
 const s=store();if(!s)return {}
 try{
  const raw=s.getItem(builtKey(club));if(!raw||raw.length>200000)return {}
  const m=JSON.parse(raw) as unknown;if(!m||typeof m!=='object'||Array.isArray(m))return {}
  const out:Record<string,Built>={}
  for(const [k,v] of Object.entries(m as Record<string,unknown>).slice(0,500)){
   const r=v as Record<string,unknown>
   if(k.length<=120&&r&&typeof r.t==='string'&&r.t.length===24&&Number.isFinite(r.s))out[k]={t:r.t,s:Math.max(0,Math.floor(r.s as number)),p:r.p===true,at:typeof r.at==='string'?r.at.slice(0,30):''}
  }
  return out
 }catch{return {}}
}
export function saveBuilt(club:string,kitId:string,entry:Built):boolean{
 const s=store();if(!s)return false
 try{
  const all=readBuilt(club),was=all[kitId]
  all[kitId]={t:entry.t,s:Math.max(entry.s,was?.s??0),p:entry.p||was?.p===true,at:was?.at||entry.at}
  s.setItem(builtKey(club),JSON.stringify(all));return true
 }catch{return false}
}

// ------------------------------------------------------------------ briefs — a prompt to design to, never a score
export type BriefId='two-tone'|'classic'|'squad'|'badge-only'
export const BRIEFS:readonly {id:BriefId;met:(s:ClothSpec)=>boolean}[]=[
 {id:'two-tone',met:s=>!!s.base&&!!s.trim&&s.pattern!=='solid'},
 {id:'classic',met:s=>!!s.base&&s.pattern==='solid'&&!s.trim&&!s.sponsor&&s.collar!=='round'},
 {id:'squad',met:s=>!!s.base&&!!s.name&&s.number!==null},
 {id:'badge-only',met:s=>!!s.base&&s.crest&&!s.sponsor},
]
