import 'server-only'
import {createHash} from 'node:crypto'
import {loadClubBase,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {ratedPool,rumbleReadiness,FIVE} from '@/lib/clubs/rumble'
import {quotaFor} from '@/lib/clubs/rumble-xi/quota'
import {xiReadiness} from '@/lib/clubs/rumble-xi/readiness'
import {FORMATION_IDS} from '@/lib/clubs/rumble-xi/formations'
import {withPlayerOverrides} from './apply'
import {getSnapshot,mergePatch,setSnapshot} from './effective'
import {parseCsv,unquoteCell} from './csv'
import {parsePatch} from './validate'
import {appendAuditMany,everyRow,findBase,readAudit,Refusal,withHypothetical,type Actor,type Row} from './service'
import {refreshSnapshot} from './snapshot'
import {update} from './store'
import {EMPTY_SNAPSHOT,keyOf,POSITIONS,type Override,type Patch,type Pos,type Snapshot} from './types'
/**
 * Bulk edit by CSV (spec §8). The file names men by `club_id` + `player_id` — never by name. A blank cell leaves the field alone; `inherit` clears an override;
 * `unknown` (a position) makes him a free man. PREVIEW writes nothing and returns every row's fate, the price ladder and game readiness per club after the whole
 * batch, and a token; COMMIT needs that token, refuses the whole batch if any row is invalid / missing / stale (no partial writes), and writes one revision.
 */
export const MAX_ROWS=2000,MAX_BYTES=1_000_000
export type RowStatus='changed'|'unchanged'|'invalid'|'missing'|'conflict'
export type BulkRow={line:number;club:string;id:string;name:string;status:RowStatus;note:string;locked:boolean;before:Partial<Pick<Row,'price'|'positions'|'rating'|'removed'>>;patch:Patch|null}
export type ClubAfter={club:string;n:number;have:Record<number,number>;want:Record<number,number>;violations:string[];broke:string[]}
export type BulkPreview={rows:BulkRow[];counts:Record<RowStatus,number>;clubs:ClubAfter[];lockedRows:number;token:string;revision:number}
const HEADERS=['club_id','player_id','proposed_price_m','primary_position','secondary_positions','rating_override','removed','reason','expected_revision']
const cellOf=(r:string[],h:string[],k:string)=>{const i=h.indexOf(k);return i<0?'':unquoteCell(r[i]??'')}
function toPatch(r:string[],h:string[]):{patch:Patch}|{error:string}{
 const o:Record<string,unknown>={}
 const price=cellOf(r,h,'proposed_price_m');if(price!==''){if(price==='inherit')o.price=null;else{const n=Number(price);if(!Number.isInteger(n))return {error:'proposed_price_m is not a whole number'};o.price=n}}
 const prim=cellOf(r,h,'primary_position').toUpperCase(),sec=cellOf(r,h,'secondary_positions').toUpperCase()
 if(prim!==''||sec!==''){
  if(prim==='INHERIT')o.positions=null
  else if(prim==='UNKNOWN')o.positions=[]
  else{if(prim==='')return {error:'secondary_positions needs a primary_position'};const list=[prim,...sec.split(/[\/;|\s]+/).filter(Boolean)];o.positions=[...new Set(list)]}}
 const rt=cellOf(r,h,'rating_override');if(rt!==''){if(rt==='inherit')o.rating=null;else{const n=Number(rt);if(!Number.isInteger(n))return {error:'rating_override is not a whole number'};o.rating=n}}
 const rm=cellOf(r,h,'removed').toLowerCase();if(rm!==''){if(rm==='true')o.removed=true;else if(rm==='false')o.removed=false;else return {error:'removed must be true or false'}}
 if(!Object.keys(o).length)return {error:'no field to change'}
 const p=parsePatch(o);return p.ok?{patch:p.patch}:{error:p.error}
}
const same=(a:readonly string[],b:readonly string[])=>a.length===b.length&&a.every((x,i)=>x===b[i])
const eq=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b)
const FIELDS=['price','positions','rating','removed'] as const
const sameOverride=(a:Override|null,b:Override|null)=>FIELDS.every(k=>eq(a?.[k],b?.[k]))

export function readFile(text:string):{header:string[];lines:string[][]}{
 if(text.length>MAX_BYTES)throw new Refusal(400,'The file is larger than 1 MB.')
 const rows=parseCsv(text);if(!rows.length)throw new Refusal(400,'The file is empty.')
 const header=rows[0]!.map(h=>h.trim().toLowerCase().replace(/^﻿/,''))
 for(const need of ['club_id','player_id'])if(!header.includes(need))throw new Refusal(400,`Missing column "${need}". Columns: ${HEADERS.join(', ')}.`)
 if(rows.length-1>MAX_ROWS)throw new Refusal(400,`At most ${MAX_ROWS} rows per file.`)
 return {header,lines:rows.slice(1)}
}
export async function bulkPreview(text:string):Promise<BulkPreview>{
 await refreshSnapshot(true);const {header,lines}=readFile(text)
 const eff=new Map((await everyRow()).map(r=>[keyOf(r.club,r.id),r]))
 const rows:BulkRow[]=[],seen=new Set<string>(),next=new Map<string,Override|null>()
 for(const [i,r] of lines.entries()){
  const club=cellOf(r,header,'club_id'),id=cellOf(r,header,'player_id'),key=keyOf(club,id),line=i+2,row=eff.get(key)
  const base:Omit<BulkRow,'status'|'note'|'patch'>={line,club,id,name:row?.name??'',locked:!!row?.locked,before:row?{price:row.price,positions:row.positions,rating:row.rating,removed:row.removed}:{}}
  if(!row){rows.push({...base,status:'missing',note:CORE_CLUB_IDS.includes(club)?'No such player at this club (names are never matched).':'No such club.',patch:null});continue}
  if(seen.has(key)){rows.push({...base,status:'invalid',note:'This player appears twice in the file.',patch:null});continue}
  seen.add(key)
  const exp=cellOf(r,header,'expected_revision');if(exp!==''&&Number(exp)!==row.rev){rows.push({...base,status:'conflict',note:`Expected revision ${exp}, the player is at ${row.rev}.`,patch:null});continue}
  const t=toPatch(r,header);if('error' in t){rows.push({...base,status:'invalid',note:t.error,patch:null});continue}
  // a value equal to what the archive already says is not an override: it clears one if there is one, and is a no-op if there is not (the desk does the same)
  const np:Patch={...t.patch};if(np.price===row.basePrice)np.price=null;if(np.positions&&same(np.positions,row.basePositions))np.positions=null;if(np.rating===row.baseRating)np.rating=null
  t.patch=np
  const cur=getSnapshot().overrides[key]??null,merged=mergePatch(cur,t.patch,{by:'bulk',at:'',reason:''})
  if(sameOverride(cur,merged)){rows.push({...base,status:'unchanged',note:'Already so.',patch:t.patch});continue}
  const priceMoves=!eq(cur?.price,merged?.price)
  rows.push({...base,status:'changed',note:priceMoves&&row.locked?'Locked price — needs the owner’s exception.':'',patch:t.patch});next.set(key,merged)
 }
 const counts={changed:0,unchanged:0,invalid:0,missing:0,conflict:0} as Record<RowStatus,number>;for(const r of rows)counts[r.status]++
 // the whole batch laid over the published snapshot, then each touched club judged once
 const touched=[...new Set(rows.filter(r=>r.status==='changed').map(r=>r.club))]
 const snap:Snapshot={...getSnapshot(),overrides:{...getSnapshot().overrides}};for(const [k,v] of next){if(v)snap.overrides[k]=v;else delete snap.overrides[k]}
 const clubs:ClubAfter[]=[]
 for(const club of touched){const raw=await loadClubBase(club);if(!raw)continue
  clubs.push(withHypothetical(snap,()=>{const pool=ratedPool(withPlayerOverrides(club,raw.data)),have:Record<number,number>={1:0,2:0,3:0,4:0,5:0};for(const c of pool)have[c.price]!+=1
   const want=quotaFor(pool.length).counts as Record<number,number>,violations=[1,2,3,4,5].filter(p=>have[p]!==want[p]).map(p=>`€${p}M: ${have[p]} men, the ladder says ${want[p]}`),broke:string[]=[]
   if(!rumbleReadiness(pool,FIVE).playable)broke.push('five-a-side')
   for(const f of FORMATION_IDS)if(!xiReadiness(pool,f,6).ready)broke.push(f)
   return {club,n:pool.length,have,want,violations,broke}}))}
 const token=createHash('sha256').update(JSON.stringify([getSnapshot().revision,rows.filter(r=>r.status==='changed').map(r=>[r.club,r.id,r.patch])])).digest('hex').slice(0,24)
 return {rows,counts,clubs,lockedRows:rows.filter(r=>r.status==='changed'&&r.note.startsWith('Locked')).length,token,revision:getSnapshot().revision}
}
export type CommitOpts={token:string;idempotencyKey:string;reason:string;confirmQuota?:boolean;ownerException?:boolean}
export async function bulkCommit(text:string,o:CommitOpts,who:Actor){
 if(!/^[A-Za-z0-9_-]{8,64}$/.test(o.idempotencyKey||''))throw new Refusal(400,'An idempotency key of 8–64 letters, digits, - or _ is required.')
 if(!o.reason||o.reason.trim().length<3)throw new Refusal(400,'A reason is required to publish a batch.')
 const tag=`batch ${o.idempotencyKey}`
 if((await readAudit()).some(e=>e.reason.startsWith(tag)))return {replayed:true,revision:getSnapshot().revision}
 const pv=await bulkPreview(text)
 if(pv.token!==o.token)throw new Refusal(409,'The data changed since the preview. Preview the file again.',{revision:pv.revision})
 const bad=pv.rows.filter(r=>['invalid','missing','conflict'].includes(r.status));if(bad.length)throw new Refusal(422,`${bad.length} row(s) cannot be applied; nothing was written. Fix the file and preview again.`,{rows:bad.slice(0,20)})
 const changed=pv.rows.filter(r=>r.status==='changed');if(!changed.length)throw new Refusal(400,'Nothing to change.')
 if(pv.lockedRows&&!(o.ownerException&&who.role==='owner'))throw new Refusal(403,`${pv.lockedRows} row(s) change a locked or pinned price: this needs the owner’s explicit exception.`,{lockedRows:pv.lockedRows})
 const off=pv.clubs.filter(c=>c.violations.length),broke=pv.clubs.filter(c=>c.broke.length)
 if(broke.length)throw new Refusal(422,`This batch would stop a game working (${broke.map(c=>c.club+': '+c.broke.join(', ')).join('; ')}). Nothing was written.`,{clubs:broke})
 if(off.length&&!o.confirmQuota)throw new Refusal(422,'This batch leaves clubs off their price ladder. Confirm to publish it as an exception.',{clubs:off})
 const at=new Date().toISOString(),reason=`${tag}: ${o.reason.trim()}`
 const events:Parameters<typeof appendAuditMany>[0]=[];let revision=0
 const snap=await update<Snapshot>('published.json',EMPTY_SNAPSHOT,s=>{
  const ov={...s.overrides};events.length=0
  for(const r of changed){const key=keyOf(r.club,r.id),cur=ov[key]??null,nx=mergePatch(cur,r.patch!,{by:who.actor,at,reason})
   if((cur?.rev??0)!==(getSnapshot().overrides[key]?.rev??0))throw new Refusal(409,'A player changed while the batch was being written. Preview again.')
   if(nx)ov[key]=nx;else delete ov[key];events.push({action:'publish',club:r.club,player:r.id,before:cur,after:nx,reason,revision:s.revision+1})}
  revision=s.revision+1;return {revision,updatedAt:at,overrides:ov}})
 setSnapshot(snap);await appendAuditMany(events,who)
 return {replayed:false,revision,changed:changed.length}
}
void findBase;void POSITIONS;void ({} as Pos)
