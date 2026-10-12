import 'server-only'
import {fileArea} from '@/lib/master/files'
import {inOrder} from '@/lib/master/cas'
import type {Career} from './types'
import type {Friendly} from './friendly'

/**
 * Where careers live (ADR-fanlife-0011, revised 12.10.2026): one JSON document per career in the durable store
 * (`worker_fanlife_files`, server only, rule 105) — `fanleague/careers/<id>.json` — and a small index per owner hash. A save is
 * compare-and-swap on the document's etag, so two taps or two tabs can never both apply: the loser re-reads and the action's
 * revision check refuses it. Without a durable store (a serverless host with memory only) a save is REFUSED, never faked.
 */
const area=fileArea('fanleague')
export type OwnerIndex={v:1;careers:{id:string;club:string;clubName:string;decade:number;createdAt:string;status:Career['status']}[];friendlies?:{id:string;role:'inviter'|'invitee';at:string}[]}
const EMPTY:OwnerIndex={v:1,careers:[]}
export class SaveUnavailable extends Error{readonly code='unavailable' as const}
export const canSave=()=>area.kind().durable
const idOk=(id:string)=>/^[a-f0-9]{16,32}$/.test(id)
const ownerOk=(o:string)=>/^[a-f0-9]{32}$/.test(o)

export async function readCareer(id:string,fresh=false):Promise<{career:Career;etag:string}|null>{
 if(!idOk(id))return null
 const r=await area.read(`careers/${id}.json`,fresh).catch(()=>null);if(!r)return null
 try{const c=JSON.parse(r.text) as Career;return c?.v===1&&c.id===id?{career:c,etag:r.etag}:null}catch{return null}
}
export async function insertCareer(c:Career):Promise<void>{
 if(!canSave())throw new SaveUnavailable('Saving is not available right now — nothing was changed.')
 if(!await area.write(`careers/${c.id}.json`,JSON.stringify(c),null))throw new Error('A career with this id already exists.')
 await touchIndex(c)
}
/** one action, compare-and-swap: `fn` sees the freshest copy; returning null writes nothing */
export async function mutateCareer<T extends {career:Career;replay?:boolean}>(id:string,fn:(c:Career)=>T|{error:unknown}|null):Promise<T|{error:unknown}|null>{
 if(!canSave())throw new SaveUnavailable('Saving is not available right now — nothing was changed.')
 // one instance takes one career's moves in turn; across instances the store's compare-and-swap decides
 return inOrder(`fanleague:career:${id}`,async()=>{
 for(let i=0;i<5;i++){
  const cur=await readCareer(id,true);if(!cur)return null
  const out=fn(cur.career);if(!out||'error' in out)return out
  if(out.career===cur.career)return out
  if(await area.write(`careers/${id}.json`,JSON.stringify(out.career),cur.etag)){if(out.career.status!==cur.career.status)await touchIndex(out.career).catch(()=>{});return out}
 }
 throw new Error('The career is busy — try again.')
 })
}
export async function ownerIndex(owner:string):Promise<OwnerIndex>{
 if(!ownerOk(owner))return EMPTY
 const r=await area.read(`owners/${owner}.json`).catch(()=>null);if(!r)return EMPTY
 try{const v=JSON.parse(r.text) as OwnerIndex;return v?.v===1&&Array.isArray(v.careers)?v:EMPTY}catch{return EMPTY}
}
async function touchIndex(c:Career){
 if(!ownerOk(c.owner))return
 await area.update<OwnerIndex>(`owners/${c.owner}.json`,EMPTY,cur=>{
  const row={id:c.id,club:c.clubId,clubName:c.clubName,decade:c.homeDecade,createdAt:c.createdAt,status:c.status}
  const rest=(cur?.v===1?cur.careers:[]).filter(x=>x.id!==c.id)
  return {...(cur?.v===1?cur:EMPTY),v:1,careers:[row,...rest].slice(0,50)}
 })
}

/* ───────── friendlies: one document each, the same compare-and-swap ───────── */
export async function readFriendly(id:string,fresh=false):Promise<{friendly:Friendly;etag:string}|null>{
 if(!idOk(id))return null
 const r=await area.read(`friendlies/${id}.json`,fresh).catch(()=>null);if(!r)return null
 try{const f=JSON.parse(r.text) as Friendly;return f?.v===1&&f.id===id?{friendly:f,etag:r.etag}:null}catch{return null}
}
export async function insertFriendly(f:Friendly):Promise<void>{
 if(!canSave())throw new SaveUnavailable('Saving is not available right now — nothing was changed.')
 if(!await area.write(`friendlies/${f.id}.json`,JSON.stringify(f),null))throw new Error('An invitation with this id already exists.')
 await noteFriendly(f.inviter.owner,f.id,'inviter')
}
/** one answer to an invitation, compare-and-swap; a second answer sees the first and is refused */
export async function mutateFriendly(id:string,fn:(f:Friendly)=>{ok:true;friendly:Friendly}|{ok:false;error:string}):Promise<{ok:true;friendly:Friendly}|{ok:false;error:string}|null>{
 if(!canSave())throw new SaveUnavailable('Saving is not available right now — nothing was changed.')
 return inOrder(`fanleague:friendly:${id}`,async()=>{
  for(let i=0;i<5;i++){
   const cur=await readFriendly(id,true);if(!cur)return null
   const out=fn(cur.friendly);if(!out.ok)return out
   if(await area.write(`friendlies/${id}.json`,JSON.stringify(out.friendly),cur.etag)){if(out.friendly.invitee)await noteFriendly(out.friendly.invitee.owner,id,'invitee').catch(()=>{});return out}
  }
  throw new Error('The invitation is busy — try again.')
 })
}
async function noteFriendly(owner:string,id:string,role:'inviter'|'invitee'){
 if(!ownerOk(owner))return
 await area.update<OwnerIndex>(`owners/${owner}.json`,EMPTY,cur=>{const base=cur?.v===1?cur:EMPTY;return {...base,friendlies:[{id,role,at:new Date().toISOString()},...(base.friendlies??[]).filter(x=>x.id!==id)].slice(0,60)}})
}
