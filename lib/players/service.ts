import 'server-only'
import {createHash} from 'node:crypto'
import {loadClubBase,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {REGISTRY} from '@/lib/master/registry'
import {rawPool,rumbleReadiness,ratedPool,FIVE,type Pos as GPos} from '@/lib/clubs/rumble'
import {extraPositions} from '@/lib/clubs/rumble-xi/positions'
import {priceTable,hasPrice} from '@/lib/clubs/rumble-xi/prices'
import {quotaFor} from '@/lib/clubs/rumble-xi/quota'
import {xiReadiness} from '@/lib/clubs/rumble-xi/readiness'
import {FORMATION_IDS} from '@/lib/clubs/rumble-xi/formations'
import {mergesFor} from '@/lib/clubs/rumble-xi/merges'
import {isMan} from '@/lib/clubs/rumble-xi/names'
import {norm} from '@/lib/fixtures/names'
import {withPlayerOverrides} from './apply'
import {getSnapshot,mergePatch,overrideOf,setSnapshot} from './effective'
import {refreshSnapshot,lastError} from './snapshot'
import {readJson,update,playersStorage} from './store'
import {parsePatch} from './validate'
import {EMPTY_SNAPSHOT,keyOf,type AuditEvent,type Draft,type Override,type Patch,type Pos,type Snapshot} from './types'

export type Row={
 club:string;clubName:string;id:string;name:string;nameOriginal:string;aliases:string[];decade:string;fromYear:number|null;toYear:number|null
 basePositions:Pos[];positions:Pos[];positionState:'archive'|'public-source'|'workbook'|'owner'|'unknown'
 basePrice:number;price:number;priceSource:'frozen-list'|'fallback'|'owner';baseRating:number;rating:number;ratingBasis:string
 locked:boolean;lockReason:string;removed:boolean;mergedInto:string|null;overridden:string[];draft:boolean;wave:boolean;confidence:number;rev:number;updatedAt:string|null;updatedBy:string|null;note:string
}
export const decadeOf=(from:number|null,to:number|null):string=>{const y=from!==null&&to!==null?Math.round((from+to)/2):from??to;return y===null||y<1850?'unknown':`${Math.floor(y/10)*10}s`}
const clubName=(id:string)=>REGISTRY.find(c=>c.id===id)?.name??id
const strip=(s:string)=>norm(s).normalize('NFD').replace(/[̀-ͯ]/g,'')

/* ─────────────── the archive's own values (immutable per deployment) ─────────────── */
type BaseRow={club:string;clubName:string;id:string;name:string;nameOriginal:string;aliases:string[];decade:string;fromYear:number|null;toYear:number|null
 basePositions:Pos[];basePositionState:Row['positionState'];basePrice:number;hasList:boolean;baseRating:number;ratingBasis:string;locked:boolean;lockReason:string;wave:boolean;confidence:number}
type Base={row:BaseRow;key:string}
const baseCache=new Map<string,Base[]>()
async function baseOf(club:string):Promise<Base[]>{
 const hit=baseCache.get(club);if(hit)return hit
 const b=await loadClubBase(club);if(!b)return []
 const extra=extraPositions(club),pool=new Map(rawPool(b.data,{extra,base:true}).map(r=>[r.id,r])),dropped=new Set(mergesFor(club).map(m=>m.drop)),list=priceTable.clubs[club]?.players??{}
 const out:Base[]=[]
 for(const f of b.data.players??[]){const p=f.value;if(!isMan(p.name)||dropped.has(p.id))continue
  const r=pool.get(p.id);if(!r)continue
  const entry=list[p.id],fam:Pos[]=r.free?[]:[r.position,...(r.alt??[])]
  const state:Row['positionState']=p.positions.length?'archive':extra[p.id]?'public-source':!r.free?'workbook':'unknown'
  out.push({key:keyOf(club,p.id),row:{club,clubName:clubName(club),id:p.id,name:r.name,nameOriginal:p.name,aliases:p.aliases.slice(0,6),decade:decadeOf(p.fromYear,p.toYear),fromYear:p.fromYear,toYear:p.toYear,
   basePositions:fam,basePositionState:state,basePrice:entry?.priceM??1,hasList:!!entry,baseRating:r.rating,ratingBasis:r.basis??'derived',locked:!!entry&&(entry.locked||entry.assignment==='owner-pinned'),
   lockReason:entry?.assignment==='owner-pinned'?'owner-pinned: '+(entry.rationale||''):entry?.locked?'locked':'',wave:/[:_]wv-/.test(p.id),confidence:f.confidence}})}
 baseCache.set(club,out);return out
}
/* ─────────────── effective rows ─────────────── */
function effective(b:Base,drafts:Record<string,Draft>):Row{
 const r=b.row,o=overrideOf(r.club,r.id)
 return {club:r.club,clubName:r.clubName,id:r.id,name:r.name,nameOriginal:r.nameOriginal,aliases:r.aliases,decade:r.decade,fromYear:r.fromYear,toYear:r.toYear,
  basePositions:r.basePositions,positions:o?.positions??r.basePositions,positionState:o?.positions?'owner':r.basePositionState,
  basePrice:r.basePrice,price:o?.price??r.basePrice,priceSource:o?.price!==undefined?'owner':r.hasList?'frozen-list':'fallback',
  baseRating:r.baseRating,rating:o?.rating??r.baseRating,ratingBasis:o?.rating!==undefined?'owner':r.ratingBasis,locked:r.locked,lockReason:r.lockReason,removed:!!o?.removed,mergedInto:o?.mergedInto??null,
  overridden:o?(['price','positions','rating','removed','mergedInto','note'] as const).filter(k=>k in o):[],draft:!!drafts[b.key],wave:r.wave,confidence:r.confidence,rev:o?.rev??0,updatedAt:o?.at??null,updatedBy:o?.by??null,note:o?.note??''}
}
let draftsCache:{at:number;v:Record<string,Draft>}|null=null
async function drafts(fresh=false){if(!fresh&&draftsCache&&Date.now()-draftsCache.at<2000)return draftsCache.v;const v=(await readJson<{drafts:Record<string,Draft>}>('drafts.json',{drafts:{}})).drafts;draftsCache={at:Date.now(),v};return v}

export type Query={clubs?:string[];q?:string;positions?:string[];prices?:number[];status?:string;decade?:string;sort?:string;dir?:'asc'|'desc';page?:number;limit?:number}
export type Listing={rows:Row[];total:number;page:number;pages:number;revision:number;counts:Record<string,number>;decades:string[];storage:ReturnType<typeof playersStorage>&{error:string|null}}
export async function listPlayers(q:Query):Promise<Listing>{
 await refreshSnapshot();const dr=await drafts()
 const clubs=(q.clubs?.length?q.clubs:CORE_CLUB_IDS).filter(c=>CORE_CLUB_IDS.includes(c))
 const all:Row[]=[];for(const c of clubs)for(const b of await baseOf(c))all.push(effective(b,dr))
 const term=q.q?strip(q.q):''
 const pass=(r:Row)=>{
  if(q.positions?.length){const want=new Set(q.positions);if(!(r.positions.length?r.positions.some(p=>want.has(p)):want.has('unknown')))return false}
  if(q.prices?.length&&!q.prices.includes(r.price))return false
  if(q.decade&&r.decade!==q.decade)return false
  switch(q.status){case 'missing-position':if(r.positions.length)return false;break;case 'overridden':if(!r.overridden.length)return false;break;case 'draft':if(!r.draft)return false;break;case 'removed':if(!r.removed)return false;break;case 'merged':if(!r.mergedInto)return false;break
   case 'fallback-price':if(r.priceSource!=='fallback')return false;break;case 'locked':if(!r.locked)return false;break;case 'wave':if(!r.wave)return false;break;case 'archive':if(r.wave)return false;break}
  if(q.status!=='removed'&&r.removed&&q.status!=='overridden')return false
  if(q.status!=='merged'&&r.mergedInto&&q.status!=='overridden')return false
  if(term){const hay=[r.name,r.nameOriginal,r.id,...r.aliases].map(strip).join(' | ');if(!hay.includes(term))return false}
  return true}
 const rows=all.filter(pass)
 const dir=q.dir==='desc'?-1:1,by=q.sort??'club'
 const val=(r:Row):string|number=>by==='name'?r.name.toLowerCase():by==='price'?r.price:by==='rating'?r.rating:by==='years'?(r.fromYear??9999):by==='updated'?(r.updatedAt??''):0
 rows.sort((a,b)=>{const g=by==='club'?0:(val(a)<val(b)?-1:val(a)>val(b)?1:0)*dir;return g||a.clubName.localeCompare(b.clubName)||a.decade.localeCompare(b.decade)||a.name.localeCompare(b.name)||a.id.localeCompare(b.id)})
 const limit=Math.min(200,Math.max(10,q.limit??60)),pages=Math.max(1,Math.ceil(rows.length/limit)),page=Math.min(Math.max(1,q.page??1),pages)
 const counts={total:all.length,shown:rows.length,missingPosition:all.filter(r=>!r.positions.length&&!r.removed&&!r.mergedInto).length,fallbackPrice:all.filter(r=>r.priceSource==='fallback').length,overridden:all.filter(r=>r.overridden.length).length,drafts:all.filter(r=>r.draft).length,removed:all.filter(r=>r.removed).length,merged:all.filter(r=>r.mergedInto).length,locked:all.filter(r=>r.locked).length}
 return {rows:rows.slice((page-1)*limit,page*limit),total:rows.length,page,pages,revision:getSnapshot().revision,counts,decades:[...new Set(all.map(r=>r.decade))].sort(),storage:{...playersStorage(),error:lastError()}}
}
export async function findBase(club:string,id:string):Promise<Base|null>{if(!CORE_CLUB_IDS.includes(club))return null;return (await baseOf(club)).find(b=>b.row.id===id)??null}

/* ─────────────── detail, audit ─────────────── */
export const readAudit=()=>readJson<AuditEvent[]>('audit.json',[])
export async function playerDetail(club:string,id:string){
 await refreshSnapshot();const b=await findBase(club,id);if(!b)return null
 const dr=await drafts(true),d=dr[b.key]
 return {row:effective(b,dr),base:b.row,override:overrideOf(club,id)??null,draft:d??null,audit:(await readAudit()).filter(e=>e.club===club&&e.player===id).slice(-40).reverse(),
  consumers:['Royal Rumble five-a-side','Royal Rumble XI','Blind Cow','Polls','Archive pages']}
}
export async function auditLog(limit=100){return (await readAudit()).slice(-limit).reverse()}

/* ─────────────── what a change would do ─────────────── */
export function withHypothetical<T>(snap:Snapshot,fn:()=>T):T{const prev=getSnapshot();setSnapshot(snap);try{return fn()}finally{setSnapshot(prev)}}
export type Impact={quota:{ok:boolean;want:Record<number,number>;have:Record<number,number>;violations:string[]};readiness:{before:string[];after:string[];broke:string[]};consumers:string[];lockedChange:boolean;iconChange:boolean}
export async function impactOf(club:string,id:string,patch:Patch):Promise<Impact|null>{
 const b=await findBase(club,id);if(!b)return null
 const raw=await loadClubBase(club);if(!raw)return null
 const cur=overrideOf(club,id)??null,next=mergePatch(cur,patch,{by:'preview',at:'',reason:''})
 const snapOf=(o:Override|null):Snapshot=>{const ov={...getSnapshot().overrides};if(o)ov[keyOf(club,id)]=o;else delete ov[keyOf(club,id)];return {...getSnapshot(),overrides:ov}}
 const probe=(o:Override|null)=>withHypothetical(snapOf(o),()=>{
  const data=withPlayerOverrides(club,raw.data),pool=ratedPool(data),have:Record<number,number>={1:0,2:0,3:0,4:0,5:0};for(const c of pool)have[c.price]!+=1
  const five=rumbleReadiness(pool,FIVE),bad:string[]=[];if(!five.playable)bad.push('five-a-side: '+five.short.join(', '))
  for(const f of FORMATION_IDS){const r=xiReadiness(pool,f,6);if(!r.ready)bad.push(`${f}: ${r.reasons[0]??'not ready'}`)}
  return {have,n:pool.length,bad}})
 const before=probe(cur),after=probe(next)
 const want=quotaFor(after.n).counts as Record<number,number>,violations:string[]=[]
 for(const p of [5,4,3,2,1])if(after.have[p]!==want[p])violations.push(`€${p}M: ${after.have[p]} men, the ladder says ${want[p]}`)
 const effPrice=(next?.price??b.row.basePrice),curPrice=(cur?.price??b.row.basePrice)
 const eq=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b)
 const moved=(k:'price'|'positions'|'rating'|'removed'|'mergedInto')=>!eq(cur?.[k],next?.[k])
 const consumers=[...(moved('price')||moved('rating')?['Royal Rumble five-a-side','Royal Rumble XI']:[]),...(moved('positions')?['Royal Rumble slots (five and XI)','Polls','Blind Cow candidates']:[]),...(moved('removed')||moved('mergedInto')?['Every game','Archive pages']:[])]
 return {quota:{ok:!violations.length,want,have:after.have,violations},readiness:{before:before.bad,after:after.bad,broke:after.bad.filter(x=>!before.bad.includes(x))},consumers:[...new Set(consumers)],
  lockedChange:b.row.locked&&patch.price!==undefined&&effPrice!==curPrice,iconChange:b.row.locked&&b.row.basePrice===5&&patch.price!==undefined&&effPrice!==curPrice}
}

/* ─────────────── writes ─────────────── */
export class Refusal extends Error{constructor(public status:400|403|404|409|422|503,message:string,public detail?:unknown){super(message)}}
export type Actor={actor:string;role:string}
const newId=()=>'a-'+createHash('sha256').update(String(Math.random())+Date.now()).digest('hex').slice(0,14)
export async function saveDraft(club:string,id:string,raw:unknown,expectedRev:number,who:Actor){
 const b=await findBase(club,id);if(!b)throw new Refusal(404,'No such player at this club.')
 const p=parsePatch(raw);if(!p.ok)throw new Refusal(400,p.error)
 await refreshSnapshot(true);const rev=overrideOf(club,id)?.rev??0
 if(rev!==expectedRev)throw new Refusal(409,'This player was changed by someone else since you opened it.',{currentRev:rev})
 const d:Draft={patch:p.patch,baseRev:rev,by:who.actor,at:new Date().toISOString()}
 await update<{drafts:Record<string,Draft>}>('drafts.json',{drafts:{}},c=>({drafts:{...c.drafts,[b.key]:d}}));draftsCache=null
 return d
}
export async function discardDraft(club:string,id:string,who:Actor){
 await update<{drafts:Record<string,Draft>}>('drafts.json',{drafts:{}},c=>{const n={...c.drafts};delete n[keyOf(club,id)];return {drafts:n}});draftsCache=null
 await appendAudit({action:'discard',club,player:id,before:null,after:null,reason:'draft discarded',revision:getSnapshot().revision},who)
}
export async function appendAuditMany(es:Omit<AuditEvent,'id'|'at'|'actor'|'role'>[],who:Actor){await update<AuditEvent[]>('audit.json',[],c=>[...c,...es.map(e=>({id:newId(),at:new Date().toISOString(),actor:who.actor,role:who.role,...e}))])}
async function appendAudit(e:Omit<AuditEvent,'id'|'at'|'actor'|'role'>,who:Actor){await update<AuditEvent[]>('audit.json',[],c=>[...c,{id:newId(),at:new Date().toISOString(),actor:who.actor,role:who.role,...e}])}
export type PublishOpts={reason:string;confirmQuota?:boolean;ownerException?:boolean;patch?:unknown;expectedRev?:number}
export async function publish(club:string,id:string,opts:PublishOpts,who:Actor){
 const b=await findBase(club,id);if(!b)throw new Refusal(404,'No such player at this club.')
 if(!opts.reason||opts.reason.trim().length<3)throw new Refusal(400,'A reason is required to publish.')
 await refreshSnapshot(true)
 const d=(await drafts(true))[b.key]
 let patch:Patch,baseRev:number
 if(opts.patch!==undefined){const p=parsePatch(opts.patch);if(!p.ok)throw new Refusal(400,p.error);patch=p.patch;baseRev=opts.expectedRev??getSnapshot().overrides[b.key]?.rev??0}
 else if(d){patch=d.patch;baseRev=d.baseRev}else throw new Refusal(400,'There is no draft to publish.')
 const cur=overrideOf(club,id)??null
 if((cur?.rev??0)!==baseRev)throw new Refusal(409,'This player was changed by someone else since the draft was made.',{currentRev:cur?.rev??0,current:cur})
 const imp=await impactOf(club,id,patch);if(!imp)throw new Refusal(404,'No such player at this club.')
 if(imp.lockedChange&&!(opts.ownerException&&who.role==='owner'))throw new Refusal(403,imp.iconChange?'This is a pinned €5M icon: changing it needs the owner’s explicit exception.':'This price is locked: changing it needs the owner’s explicit exception.',imp)
 if(!imp.quota.ok&&!opts.confirmQuota)throw new Refusal(422,'This leaves the club off its price ladder. Confirm to publish it as an exception.',imp)
 const at=new Date().toISOString(),next=mergePatch(cur,patch,{by:who.actor,at,reason:opts.reason.trim()})
 let revision=0
 const snap=await update<Snapshot>('published.json',EMPTY_SNAPSHOT,s=>{
  if((s.overrides[b.key]?.rev??0)!==baseRev)throw new Refusal(409,'This player was changed by someone else a moment ago.',{currentRev:s.overrides[b.key]?.rev??0})
  const ov={...s.overrides};if(next)ov[b.key]=next;else delete ov[b.key]
  revision=s.revision+1;return {revision,updatedAt:at,overrides:ov}})
 setSnapshot(snap)
 await appendAudit({action:'publish',club,player:id,before:cur,after:next,reason:opts.reason.trim(),revision},who)
 await update<{drafts:Record<string,Draft>}>('drafts.json',{drafts:{}},c=>{const n={...c.drafts};delete n[b.key];return {drafts:n}});draftsCache=null
 return {revision,override:next,impact:imp}
}
/** put a man back to what an earlier event recorded as "before" — a new event, the old ones stay */
export async function revert(club:string,id:string,eventId:string,reason:string,who:Actor){
 const ev=(await readAudit()).find(e=>e.id===eventId&&e.club===club&&e.player===id&&e.action==='publish');if(!ev)throw new Refusal(404,'No such change to revert.')
 await refreshSnapshot(true);const cur=overrideOf(club,id)??null,target=ev.before,at=new Date().toISOString()
 const next=target?{...target,rev:(cur?.rev??0)+1,by:who.actor,at,reason:'revert: '+(reason||'')}:null
 const snap=await update<Snapshot>('published.json',EMPTY_SNAPSHOT,s=>{
  if((s.overrides[keyOf(club,id)]?.rev??0)!==(cur?.rev??0))throw new Refusal(409,'This player changed while reverting.')
  const ov={...s.overrides};if(next)ov[keyOf(club,id)]=next;else delete ov[keyOf(club,id)];return {revision:s.revision+1,updatedAt:at,overrides:ov}})
 setSnapshot(snap);await appendAudit({action:'revert',club,player:id,before:cur,after:next,reason:`revert of ${eventId}: ${reason||''}`.trim(),revision:snap.revision},who)
 return {revision:snap.revision,override:next}
}

/* ─────────────── export ─────────────── */
const cell=(v:unknown)=>{let s=v===null||v===undefined?'':String(v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return /[",\n;]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
export async function exportCsv(q:Query):Promise<string>{
 const out=['club_id,player_id,name,original_name,decade,from_year,to_year,positions,position_state,base_price_m,price_m,price_source,base_rating,rating,locked,removed,overridden,draft,source,confidence,rev']
 for(let page=1;;page++){const l=await listPlayers({...q,page,limit:200});for(const r of l.rows)out.push([r.club,r.id,r.name,r.nameOriginal,r.decade,r.fromYear,r.toYear,r.positions.join('/'),r.positionState,r.basePrice,r.price,r.priceSource,r.baseRating,r.rating,r.locked,r.removed,r.overridden.join('/'),r.draft,r.wave?'roster-wave':'archive',r.confidence,r.rev].map(cell).join(','));if(page>=l.pages)break}
 return '﻿'+out.join('\n')+'\n'
}
void ([] as GPos[])

/** every man of the chosen clubs as an effective row — the reports and the bulk preview read this, never the files */
export async function everyRow(clubs:string[]=CORE_CLUB_IDS):Promise<Row[]>{await refreshSnapshot();const dr=await drafts(),out:Row[]=[];for(const c of clubs.filter(x=>CORE_CLUB_IDS.includes(x)))for(const b of await baseOf(c))out.push(effective(b,dr));return out}
export {strip as foldName}
