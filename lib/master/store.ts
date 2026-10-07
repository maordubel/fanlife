import 'server-only'
import {appendFile,mkdir,readFile,readdir,rename,writeFile} from 'node:fs/promises'
import {AUDIT_ARCHIVE_DIR,SYSTEM_ACTOR,actorOf,archiveLines,splitAudit} from './audit-log'
import {randomUUID} from 'node:crypto'
import path from 'node:path'
import {createHash} from 'node:crypto'
import type {State,Finding,AuditEntry} from './types'
import {seedState} from './seed'
const root=()=>path.resolve(process.env.FAN_LIFE_DATA_DIR||'.fan-life')
const globals=globalThis as typeof globalThis & {fanWrites?:Promise<unknown>}
function withRegistry(s:State):State{const have=new Set(s.clubs.map(c=>c.id));const add=seedState().clubs.filter(c=>!have.has(c.id));return add.length?{...s,clubs:[...s.clubs,...add]}:s}
export const findingId=(f:Pick<Finding,'field'|'value'|'sources'>)=>'f-'+createHash('sha256').update(JSON.stringify([f.field,f.value,[...f.sources].sort()])).digest('hex').slice(0,16)
export const contentHash=(text:string)=>createHash('sha256').update(text).digest('hex').slice(0,24)
/** Older control files have findings without ids; give them their stable id on read. */
function withIds(s:State):State{for(const c of s.clubs)for(const f of c.findings){f.id??=findingId(f);if(f.approved&&!f.decision)f.decision='approved'}return s}
export async function readState():Promise<State>{try{return withIds(withRegistry(JSON.parse(await readFile(path.join(root(),'control.json'),'utf8'))))}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return seedState();throw e}}
/** F19: entries past AUDIT_KEEP are appended to their month's archive file BEFORE control.json drops them. */
async function rotateAudit(s:State){const {kept,archive}=splitAudit(s.audit);if(kept===s.audit)return;const dir=path.join(root(),AUDIT_ARCHIVE_DIR);await mkdir(dir,{recursive:true});for(const [month,rows] of Object.entries(archive))await appendFile(path.join(dir,`${month}.jsonl`),archiveLines(rows),{mode:0o600});s.audit=kept}
export function mutate<T>(fn:(s:State)=>T):Promise<T>{const op=(globals.fanWrites||Promise.resolve()).then(async()=>{const s=await readState();const result=fn(s);s.revision++;await mkdir(root(),{recursive:true});await rotateAudit(s);const temp=path.join(root(),`${randomUUID()}.tmp`);await writeFile(temp,JSON.stringify(s),{mode:0o600});await rename(temp,path.join(root(),'control.json'));return result});globals.fanWrites=op.catch(()=>undefined);return op}
/** Archived months, newest first, for the control room or an export. */
export async function auditArchiveMonths():Promise<string[]>{try{return(await readdir(path.join(root(),AUDIT_ARCHIVE_DIR))).filter(f=>/^(\d{4}-\d{2}|undated)\.jsonl$/.test(f)).map(f=>f.slice(0,-6)).sort().reverse()}catch{return[]}}
export async function readAuditArchive(month:string):Promise<AuditEntry[]>{if(!/^(\d{4}-\d{2}|undated)$/.test(month))throw new Error('Unknown archive month.');try{return(await readFile(path.join(root(),AUDIT_ARCHIVE_DIR,`${month}.jsonl`),'utf8')).split('\n').filter(Boolean).map(l=>JSON.parse(l) as AuditEntry)}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return[];throw e}}
export {actorOf}
/** Every entry names who acted (F19). Owner actions pass `actorOf(session)`; anything unattributed is `system`, never an evaluator. */
export function audit(s:State,action:string,target:string,detail='',extra:Partial<Pick<AuditEntry,'actor'|'role'|'before'|'after'|'reason'>>={}){s.audit.push({at:new Date().toISOString(),action,target,detail,...extra,actor:extra.actor||SYSTEM_ACTOR.actor,role:extra.role||(extra.actor?undefined:SYSTEM_ACTOR.role)})}
