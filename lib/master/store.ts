import 'server-only'
import {appendFile,mkdir,readFile,readdir,rename,writeFile} from 'node:fs/promises'
import {AUDIT_ARCHIVE_DIR,SYSTEM_ACTOR,actorOf,newArchiveLines,splitAudit} from './audit-log'
import {randomUUID} from 'node:crypto'
import path from 'node:path'
import {createHash} from 'node:crypto'
import type {State,Finding,AuditEntry} from './types'
import {seedState} from './seed'
import LAUNCH from './launch-defaults.json'
import {dataRoot,onServerless} from '@/lib/dataRoot'
import {durable} from './durable'
const root=dataRoot
const globals=globalThis as typeof globalThis & {fanWrites?:Promise<unknown>}
/** Owner, 8.10.2026: "open everything that can open". A non-paused club with a compiled pack is live with all its playable gates (gates are only ever added; paused stays closed). */
function withLaunch(s:State):State{for(const c of s.clubs){const g=(LAUNCH as Record<string,number[]>)[c.id];if(!g||c.status==='paused')continue;c.status='live';c.gates=[...new Set([...c.gates,...g])].sort((a,b)=>a-b)}return s}
function withRegistry(s:State):State{const have=new Set(s.clubs.map(c=>c.id));const add=seedState().clubs.filter(c=>!have.has(c.id));return withLaunch(add.length?{...s,clubs:[...s.clubs,...add]}:s)}
export const findingId=(f:Pick<Finding,'field'|'value'|'sources'>)=>'f-'+createHash('sha256').update(JSON.stringify([f.field,f.value,[...f.sources].sort()])).digest('hex').slice(0,16)
export const contentHash=(text:string)=>createHash('sha256').update(text).digest('hex').slice(0,24)
/** Older control files have findings without ids; give them their stable id on read. */
function withIds(s:State):State{for(const c of s.clubs)for(const f of c.findings){f.id??=findingId(f);if(f.approved&&!f.decision)f.decision='approved'}return s}
const CONTROL='control.json'
const parse=(text:string)=>withIds(withRegistry(JSON.parse(text)))
/** The control state and, when a durable store is connected, the ETag it was read at (for a conditional write). */
async function readWithTag():Promise<{state:State;etag:string|null}>{const d=durable();if(d){const r=await d.read(CONTROL);return r?{state:parse(r.text),etag:r.etag}:{state:seedState(),etag:null}}
 try{return{state:parse(await readFile(path.join(root(),CONTROL),'utf8')),etag:null}}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return{state:seedState(),etag:null};throw e}}
/** The last error the durable store gave on a read, for the admin's storage line; null once a read succeeds. */
const health=globalThis as typeof globalThis & {fanStoreError?:string|null;fanLastGood?:string;fanLastGoodAt?:number}
/**
 * Pages read through here. If the connected store refuses (credentials not active yet, an outage), the public site
 * keeps serving a closed copy rather than a 500, and the admin says why; a WRITE never falls back (`mutate` reads with
 * `readWithTag`, which throws), so nothing is saved somewhere that will vanish.
 */
export async function readState():Promise<State>{
 try{const r=(await readWithTag()).state;health.fanStoreError=null;remember(r);return r}
 catch(e){if(!durable())throw e;health.fanStoreError=String((e as Error)?.message||e).slice(0,300);console.error('[fan-life] durable store read failed:',health.fanStoreError)
  // fail CLOSED (audit A02, 8.10.2026): the last state this instance read, or — on a cold start — the seed with every
  // club paused and every gate off. Never the seed's own publication settings: an outage must not reopen a paused club.
  return health.fanLastGood&&Date.now()-(health.fanLastGoodAt||0)<LAST_GOOD_MS?JSON.parse(health.fanLastGood) as State:closedSeed()}
}
/** A copy another instance may have changed since is trusted only briefly; after that an outage serves every club closed. */
const LAST_GOOD_MS=10*60_000
function remember(s:State){health.fanLastGood=JSON.stringify(s);health.fanLastGoodAt=Date.now()}
export function closedSeed():State{const s=seedState();for(const c of s.clubs){c.status='paused';c.gates=[]}return s}
/** True when the last read failed and pages are running on a fallback (last good or closed). */
export const stateUnavailable=()=>!!health.fanStoreError
/** Where the control room keeps its state, for the health line in the admin. */
export function storageInfo():{kind:'vercel-blob'|'memory'|'disk'|'temporary';durable:boolean;note:string;error?:string}{const d=durable();if(d)return health.fanStoreError?{kind:d.kind,durable:false,note:'A storage store is connected but refused the last read, so nothing can be saved until it answers.',error:health.fanStoreError}:{kind:d.kind,durable:true,note:'Saved to durable storage.'};if(onServerless())return{kind:'temporary',durable:false,note:'No storage connected: changes last until this server instance restarts. Connect a Vercel Blob store to keep them.'};return{kind:'disk',durable:true,note:`Saved on this machine (${root()}).`}}
/** F19: entries past AUDIT_KEEP are appended to their month's archive file BEFORE control.json drops them. */
async function rotateAudit(s:State){const {kept,archive}=splitAudit(s.audit);if(kept===s.audit)return;const d=durable()
 if(d){for(const [month,rows] of Object.entries(archive)){for(let i=0;i<10;i++){if(i)await pause(i);const cur=await d.read(`${AUDIT_ARCHIVE_DIR}/${month}.jsonl`);const add=newArchiveLines(cur?.text||'',rows);if(!add||await d.write(`${AUDIT_ARCHIVE_DIR}/${month}.jsonl`,(cur?.text||'')+add,cur?.etag??null))break;if(i===9)throw new Error('Audit archive is busy. Try again.')}}s.audit=kept;return}
 const dir=path.join(root(),AUDIT_ARCHIVE_DIR);await mkdir(dir,{recursive:true});for(const [month,rows] of Object.entries(archive)){const f=path.join(dir,`${month}.jsonl`);const add=newArchiveLines(await readFile(f,'utf8').catch(()=>''),rows);if(add)await appendFile(f,add,{mode:0o600})}s.audit=kept}
/** Pause between retries: grows with the attempt and is jittered, so two writers that collided do not collide again in step. */
const pause=(attempt:number)=>new Promise<void>(r=>setTimeout(r,Math.min(900,40*1.7**attempt)*(0.5+Math.random())))
/** A change that loses the race re-reads and re-applies, up to this many times (owner, 9.10.2026: "the control room is busy" kept appearing at 5 immediate retries). */
const WRITE_ATTEMPTS=14
export function mutate<T>(fn:(s:State)=>T):Promise<T>{const op=(globals.fanWrites||Promise.resolve()).then(async()=>{const d=durable()
 if(d){// optimistic: read with its ETag, apply, write only if nobody wrote in between; otherwise wait a beat, re-read and re-apply
  for(let attempt=0;attempt<WRITE_ATTEMPTS;attempt++){if(attempt)await pause(attempt);const {state:s,etag}=await readWithTag();const result=fn(s);s.revision++;await rotateAudit(s);if(await d.write(CONTROL,JSON.stringify(s),etag)){remember(s);return result}}
  throw new Error('The control room is busy (another change landed at the same moment). Try again.')}
 const s=await readState();const result=fn(s);s.revision++;await mkdir(root(),{recursive:true});await rotateAudit(s);const temp=path.join(root(),`${randomUUID()}.tmp`);await writeFile(temp,JSON.stringify(s),{mode:0o600});await rename(temp,path.join(root(),CONTROL));return result});globals.fanWrites=op.catch(()=>undefined);return op}
/** Archived months, newest first, for the control room or an export. */
export async function auditArchiveMonths():Promise<string[]>{const d=durable();if(d)return(await d.list(`${AUDIT_ARCHIVE_DIR}/`)).map(f=>f.split('/').pop()!).filter(f=>/^(\d{4}-\d{2}|undated)\.jsonl$/.test(f)).map(f=>f.slice(0,-6)).sort().reverse();try{return(await readdir(path.join(root(),AUDIT_ARCHIVE_DIR))).filter(f=>/^(\d{4}-\d{2}|undated)\.jsonl$/.test(f)).map(f=>f.slice(0,-6)).sort().reverse()}catch{return[]}}
export async function readAuditArchive(month:string):Promise<AuditEntry[]>{if(!/^(\d{4}-\d{2}|undated)$/.test(month))throw new Error('Unknown archive month.');const d=durable();if(d){const r=await d.read(`${AUDIT_ARCHIVE_DIR}/${month}.jsonl`);return(r?.text||'').split('\n').filter(Boolean).map(l=>JSON.parse(l) as AuditEntry)}try{return(await readFile(path.join(root(),AUDIT_ARCHIVE_DIR,`${month}.jsonl`),'utf8')).split('\n').filter(Boolean).map(l=>JSON.parse(l) as AuditEntry)}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return[];throw e}}
export {actorOf}
/** Every entry names who acted (F19). Owner actions pass `actorOf(session)`; anything unattributed is `system`, never an evaluator. */
export function audit(s:State,action:string,target:string,detail='',extra:Partial<Pick<AuditEntry,'actor'|'role'|'before'|'after'|'reason'>>={}){s.audit.push({at:new Date().toISOString(),action,target,detail,...extra,actor:extra.actor||SYSTEM_ACTOR.actor,role:extra.role||(extra.actor?undefined:SYSTEM_ACTOR.role)})}
