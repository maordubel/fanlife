import 'server-only'
import {fileArea} from '@/lib/master/files'
import {inOrder} from '@/lib/master/cas'
import {DEFAULT_SETTINGS,LEGENDS_RULES as R,readSettings,type LegendsSettings} from './config'
import {EMPTY_CONTROL,readControl,type RatingControl} from './ratings'
import type {Career} from './types'
import type {Friendly} from './friendly'
import {saveName} from './saves'
import {planClaim} from './ownership'
import {archiveOk,archivePath,type SeasonArchive} from './history'

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
  let ords:number[]=[]
  const out=await mutateCareer(id,c=>{if(c.owner!==owner)return {error:'This career is not yours.'};ords=[...new Set([...c.history.map(h=>h.ordinal),...(c.pendingArchive??[]).map(a=>a.ordinal)])];return {career:{...c,pendingArchive:undefined,status:'deleted' as unknown as Career['status'],revision:c.revision+1,updatedAt:new Date().toISOString()}}})
  if(out&&'error' in out)return {ok:false as const,error:String(out.error)}
  await wipeArchives(id,ords)
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

/* ───────── guest → account (F05) ───────── */
/**
 * Move the careers a device key played under onto the signed-in account. The caller (a server action) has verified BOTH keys
 * itself — the browser never names an owner. Idempotent: a journal under `claims/<guest>.json` records the plan before anything
 * moves, a career already owned by the account is skipped, so a repeated or interrupted claim just finishes. Over the cap the
 * surplus is archived, never deleted. Friendlies stay with the old key (their invitation documents name it) — a known limit.
 */
export async function claimDeviceCareers(guest:string,account:string):Promise<{ok:true;moved:number;archived:number}|{ok:false;error:string}>{
 if(!canSave())refuse()
 if(!ownerOk(guest)||!ownerOk(account)||guest===account)return {ok:false,error:'Nothing to claim.'}
 // both lanes, always in the same order, so two claims cannot wait on each other
 const [a,b]=guest<account?[guest,account]:[account,guest]
 return inOrder(`legends:owner:${a}`,()=>inOrder(`legends:owner:${b}`,async()=>{
  const [gi,ai]=await Promise.all([ownerIndex(guest,true),ownerIndex(account,true)])
  const journal=await area.readJson<{to:string;move:{id:string;status:Career['status']}[];archived:string[]}|null>(`claims/${guest}.json`,null).catch(()=>null)
  const plan=journal&&journal.to===account&&gi.careers.length?{move:journal.move.filter(m=>gi.careers.some(r=>r.id===m.id)),archived:journal.archived}:planClaim(gi.careers,ai.careers,R.maxActiveCareers)
  if(!plan.move.length)return {ok:true as const,moved:0,archived:0}
  await area.update<unknown>(`claims/${guest}.json`,null,()=>({to:account,move:plan.move,archived:plan.archived,at:new Date().toISOString()}))
  let moved=0
  for(const m of plan.move){
   const out=await mutateCareer(m.id,c=>c.owner===account?{career:c}:c.owner!==guest?{error:'not the guest'}:{career:{...c,owner:account,status:m.status,revision:c.revision+1,updatedAt:new Date().toISOString()}})
   if(out&&!('error' in out)){
    moved++
    const row=gi.careers.find(r=>r.id===m.id)!
    await area.update<OwnerIndex>(`owners/${account}.json`,EMPTY,cur=>{
     const base=cur?.v===1?cur:EMPTY,taken=base.careers.filter(x=>x.id!==m.id).map(x=>x.name??'')
     const name=row.name&&!taken.includes(row.name)?row.name:saveName(row.clubName,row.id,taken)
     return {...base,v:1,careers:[{...row,status:m.status,name},...base.careers.filter(x=>x.id!==m.id)].slice(0,60)}
    })
    await area.update<OwnerIndex>(`owners/${guest}.json`,EMPTY,cur=>{const base=cur?.v===1?cur:EMPTY;return {...base,careers:base.careers.filter(x=>x.id!==m.id)}})
   }
  }
  return {ok:true as const,moved,archived:plan.archived.length}
 }))
}

/* ───────── season history (F04) ───────── */
/**
 * Write each pending season to its own document, READ IT BACK, and only then drop the pending copy from the career. The write
 * is create-only: if a document already exists with the same signature the transition was already done (idempotent); a
 * different one is left alone and the pending copy stays, so nothing is ever overwritten or lost. Best effort — a failure leaves
 * the career as it was and the next move tries again.
 */
export async function flushArchives(id:string):Promise<number>{
 if(!canSave())return 0
 const cur=await readCareer(id,true);const pending=cur?.career.pendingArchive
 if(!cur||!pending?.length)return 0
 const done:number[]=[]
 for(const a of pending){
  const name=archivePath(id,a.ordinal)
  await area.write(name,JSON.stringify(a),null).catch(()=>false)
  const back=await area.read(name,true).catch(()=>null)
  try{if(back&&archiveOk(JSON.parse(back.text),id,a.ordinal)&&(JSON.parse(back.text) as SeasonArchive).signature===a.signature)done.push(a.ordinal)}catch{/* leave it pending */}
 }
 if(!done.length)return 0
 await mutateCareer(id,c=>{
  const left=(c.pendingArchive??[]).filter(a=>!done.includes(a.ordinal))
  if(left.length===(c.pendingArchive??[]).length)return {career:c}
  const {pendingArchive:_,...rest}=c;return {career:{...rest,...(left.length?{pendingArchive:left}:{}),revision:c.revision+1,updatedAt:new Date().toISOString()}}
 })
 return done.length
}
/** one finished season, only for its owner: knowing the id is not permission */
export async function readSeasonArchive(owner:string,id:string,ordinal:number):Promise<SeasonArchive|'summary-only'|null>{
 if(!Number.isInteger(ordinal)||ordinal<1||ordinal>999)return null
 const cur=await readCareer(id);if(!cur||cur.career.owner!==owner)return null
 const pending=cur.career.pendingArchive?.find(a=>a.ordinal===ordinal);if(pending)return pending
 const r=await area.read(archivePath(id,ordinal)).catch(()=>null)
 if(r)try{const a=JSON.parse(r.text);if(archiveOk(a,id,ordinal))return a}catch{/* fall through */}
 return cur.career.history.some(h=>h.ordinal===ordinal)?'summary-only':null
}
/** which of a career's seasons have a document of their own (a small read per season, only when the history list is opened) */
export async function storedSeasons(id:string,ordinals:number[]):Promise<Set<number>>{
 const out=new Set<number>()
 await Promise.all(ordinals.map(async o=>{const r=await area.read(archivePath(id,o)).catch(()=>null);if(r)try{if(archiveOk(JSON.parse(r.text),id,o))out.add(o)}catch{/* not valid */}}))
 return out
}
/** a deleted career takes its season documents with it: there is no delete in the store, so each is overwritten with an empty tombstone */
async function wipeArchives(id:string,ordinals:number[]){
 for(const o of ordinals)await area.update<unknown>(archivePath(id,o),null,()=>({v:0,deleted:true})).catch(()=>{})
}
