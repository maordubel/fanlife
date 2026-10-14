import 'server-only'
import {fileArea} from '@/lib/master/files'
import {inOrder} from '@/lib/master/cas'
import {DEFAULT_SETTINGS,LEGENDS_RULES as R,readSettings,type LegendsSettings} from './config'
import {EMPTY_CONTROL,readControl,type RatingControl} from './ratings'
import type {Career} from './types'
import type {Friendly} from './friendly'
import {saveName} from './saves'

/**
 * Where Legends careers live (rulebook §2.11; ADR-fanlife-0011 rev. 2): one JSON document per career in the durable store
 * (`worker_fanlife_files`, server only, rule 105) under `legends/`, an index per owner hash, the owner's settings and rating
 * control. Every save is compare-and-swap on the document's etag; without a durable store a save is REFUSED, never faked.
 * FAN LEAGUE's old `fanleague/` documents are not read: the owner cleared those test careers (12.10.2026).
 */
const area=fileArea('legends')
export type IndexRow={id:string;club:string;clubName:string;createdAt:string;status:Career['status'];season:number;phase:Career['phase'];/** the save's own name, unique among the owner's saves (owner 14.10.2026) */name?:string;/** when the manager last opened it */enteredAt?:string}
export type OwnerIndex={v:1;careers:IndexRow[];friendlies?:{id:string;role:'inviter'|'invitee';at:string}[]}
const EMPTY:OwnerIndex={v:1,careers:[]}
export class SaveUnavailable extends Error{readonly code='unavailable' as const}
export const canSave=()=>area.kind().durable
const idOk=(id:string)=>/^[a-f0-9]{16,32}$/.test(id),ownerOk=(o:string)=>/^[a-f0-9]{32}$/.test(o)
const refuse=()=>{throw new SaveUnavailable('Saving is not available right now — nothing was changed.')}

export async function readCareer(id:string,fresh=false):Promise<{career:Career;etag:string}|null>{
 if(!idOk(id))return null
 const r=await area.read(`careers/${id}.json`,fresh).catch(()=>null);if(!r)return null
 try{const c=JSON.parse(r.text) as Career;return c?.v===2&&c.id===id&&(c.status as string)!=='deleted'?{career:c,etag:r.etag}:null}catch{return null}
}
export const activeCount=(i:OwnerIndex)=>i.careers.filter(c=>c.status==='active').length
/** a new career: the three-active limit is checked again INSIDE the owner's index update, so two tabs cannot both make a fourth (S01) */
export async function insertCareer(c:Career):Promise<{ok:true}|{ok:false;error:string}>{
 if(!canSave())refuse()
 return inOrder(`legends:owner:${c.owner}`,async()=>{
  const idx=await ownerIndex(c.owner,true)
  if(activeCount(idx)>=R.maxActiveCareers)return {ok:false as const,error:`You already run ${R.maxActiveCareers} careers. Archive one to start another.`}
  if(!await area.write(`careers/${c.id}.json`,JSON.stringify(c),null))return {ok:false as const,error:'A career with this id already exists.'}
  await touchIndex(c);return {ok:true as const}
 })
}
/** one action, compare-and-swap: `fn` sees the freshest copy; returning null writes nothing */
export async function mutateCareer<T extends {career:Career;replay?:boolean}>(id:string,fn:(c:Career)=>T|{error:unknown}|null):Promise<T|{error:unknown}|null>{
 if(!canSave())refuse()
 return inOrder(`legends:career:${id}`,async()=>{
  for(let i=0;i<5;i++){
   const cur=await readCareer(id,true);if(!cur)return null
   const out=fn(cur.career);if(!out||'error' in out)return out
   if(out.career===cur.career)return out
   if(await area.write(`careers/${id}.json`,JSON.stringify(out.career),cur.etag)){if(out.career.phase!==cur.career.phase||out.career.status!==cur.career.status||out.career.season.ordinal!==cur.career.season.ordinal)await touchIndex(out.career).catch(()=>{});return out}
  }
  throw new Error('The career is busy — try again.')
 })
}
/** archive or restore (§1.7.43): a restore needs a free slot, checked inside the owner's lane */
export async function setStatus(owner:string,id:string,status:Career['status']):Promise<{ok:true}|{ok:false;error:string}>{
 if(!canSave())refuse()
 return inOrder(`legends:owner:${owner}`,async()=>{
  const idx=await ownerIndex(owner,true)
  if(status==='active'&&activeCount(idx)>=R.maxActiveCareers)return {ok:false as const,error:`${R.maxActiveCareers} careers are active. Archive one first.`}
  const out=await mutateCareer(id,c=>c.owner!==owner?{error:'This career is not yours.'}:c.status===status?{career:c}:{career:{...c,status,revision:c.revision+1,updatedAt:new Date().toISOString()}})
  if(!out)return {ok:false as const,error:'Career not found.'}
  if('error' in out)return {ok:false as const,error:String(out.error)}
  await touchIndex(out.career);return {ok:true as const}
 })
}
/** the manager opened this save: stamp it, at most once in five minutes (an index write per page view would be waste) */
export async function markEntered(owner:string,id:string):Promise<void>{
 if(!ownerOk(owner)||!canSave())return
 const now=Date.now()
 await area.update<OwnerIndex>(`owners/${owner}.json`,EMPTY,cur=>{
  const base=cur?.v===1?cur:EMPTY,row=base.careers.find(x=>x.id===id)
  if(!row||(row.enteredAt&&now-Date.parse(row.enteredAt)<300_000))return base
  return {...base,careers:base.careers.map(x=>x.id===id?{...x,enteredAt:new Date(now).toISOString()}:x)}
 })
}
/** delete an ARCHIVED save for good: it leaves the owner's list and can no longer be opened (an active career must be archived first) */
export async function deleteArchived(owner:string,id:string):Promise<{ok:true}|{ok:false;error:string}>{
 if(!canSave())refuse()
 return inOrder(`legends:owner:${owner}`,async()=>{
  const idx=await ownerIndex(owner,true),row=idx.careers.find(x=>x.id===id)
  if(!row)return {ok:false as const,error:'Save not found.'}
  if(row.status!=='archived')return {ok:false as const,error:'Archive a career before deleting it.'}
  const out=await mutateCareer(id,c=>c.owner!==owner?{error:'This career is not yours.'}:{career:{...c,status:'deleted' as unknown as Career['status'],revision:c.revision+1,updatedAt:new Date().toISOString()}})
  if(out&&'error' in out)return {ok:false as const,error:String(out.error)}
  await area.update<OwnerIndex>(`owners/${owner}.json`,EMPTY,cur=>{const base=cur?.v===1?cur:EMPTY;return {...base,careers:base.careers.filter(x=>x.id!==id)}})
  return {ok:true as const}
 })
}
export async function ownerIndex(owner:string,fresh=false):Promise<OwnerIndex>{
 if(!ownerOk(owner))return EMPTY
 const r=await area.read(`owners/${owner}.json`,fresh).catch(()=>null);if(!r)return EMPTY
 try{const v=JSON.parse(r.text) as OwnerIndex;return v?.v===1&&Array.isArray(v.careers)?v:EMPTY}catch{return EMPTY}
}
async function touchIndex(c:Career){
 if(!ownerOk(c.owner))return
 await area.update<OwnerIndex>(`owners/${c.owner}.json`,EMPTY,cur=>{
  const base=cur?.v===1?cur:EMPTY
  const was=base.careers.find(x=>x.id===c.id)
  const row:IndexRow={id:c.id,club:c.clubId,clubName:c.clubName,createdAt:c.createdAt,status:c.status,season:c.season.ordinal,phase:c.phase,name:was?.name??saveName(c.clubName,c.id,base.careers.map(x=>x.name??'')),enteredAt:was?.enteredAt??c.createdAt}
  return {...base,v:1,careers:[row,...base.careers.filter(x=>x.id!==c.id)].slice(0,60)}
 })
}

/* ───────── the owner's controls ───────── */
export async function readLegendsSettings():Promise<LegendsSettings>{return readSettings(await area.readJson<unknown>('settings.json',DEFAULT_SETTINGS).catch(()=>DEFAULT_SETTINGS))}
export async function writeLegendsSettings(fn:(cur:LegendsSettings)=>LegendsSettings):Promise<LegendsSettings>{if(!canSave())refuse();return readSettings(await area.update<unknown>('settings.json',DEFAULT_SETTINGS,cur=>fn(readSettings(cur))))}
export async function readRatingControl():Promise<RatingControl>{return readControl(await area.readJson<unknown>('ratings.json',EMPTY_CONTROL).catch(()=>EMPTY_CONTROL))}
export async function writeRatingControl(fn:(cur:RatingControl)=>RatingControl):Promise<RatingControl>{if(!canSave())refuse();return readControl(await area.update<unknown>('ratings.json',EMPTY_CONTROL,cur=>fn(readControl(cur))))}

/* ───────── friendlies: one document each, the same compare-and-swap ───────── */
export async function readFriendly(id:string,fresh=false):Promise<{friendly:Friendly;etag:string}|null>{
 if(!idOk(id))return null
 const r=await area.read(`friendlies/${id}.json`,fresh).catch(()=>null);if(!r)return null
 try{const f=JSON.parse(r.text) as Friendly;return f?.v===2&&f.id===id?{friendly:f,etag:r.etag}:null}catch{return null}
}
export async function insertFriendly(f:Friendly):Promise<void>{
 if(!canSave())refuse()
 if(!await area.write(`friendlies/${f.id}.json`,JSON.stringify(f),null))throw new Error('An invitation with this id already exists.')
 await noteFriendly(f.inviter.owner,f.id,'inviter')
}
export async function mutateFriendly(id:string,fn:(f:Friendly)=>{ok:true;friendly:Friendly}|{ok:false;error:string}):Promise<{ok:true;friendly:Friendly}|{ok:false;error:string}|null>{
 if(!canSave())refuse()
 return inOrder(`legends:friendly:${id}`,async()=>{
  for(let i=0;i<5;i++){
   const cur=await readFriendly(id,true);if(!cur)return null
   const out=fn(cur.friendly);if(!out.ok)return out
   if(out.friendly===cur.friendly)return out
   if(await area.write(`friendlies/${id}.json`,JSON.stringify(out.friendly),cur.etag)){if(out.friendly.invitee)await noteFriendly(out.friendly.invitee.owner,id,'invitee').catch(()=>{});return out}
  }
  throw new Error('The invitation is busy — try again.')
 })
}
async function noteFriendly(owner:string,id:string,role:'inviter'|'invitee'){
 if(!ownerOk(owner))return
 await area.update<OwnerIndex>(`owners/${owner}.json`,EMPTY,cur=>{const base=cur?.v===1?cur:EMPTY;return {...base,friendlies:[{id,role,at:new Date().toISOString()},...(base.friendlies??[]).filter(x=>x.id!==id)].slice(0,60)}})
}
